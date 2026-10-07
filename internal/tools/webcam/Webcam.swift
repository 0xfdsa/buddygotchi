import AppKit
import AVFoundation
import CoreImage

struct Failure: Error, CustomStringConvertible {
    let description: String
    init(_ description: String) { self.description = description }
}

struct Options {
    let command: String
    var values: [String: String] = [:]
    init(_ args: [String]) throws {
        command = args.first ?? "help"
        var i = 1
        while i < args.count {
            guard args[i].hasPrefix("--"), i + 1 < args.count,
                  values[args[i]] == nil else { throw Failure("Expected unique --option value pairs") }
            values[args[i]] = args[i + 1]
            i += 2
        }
    }
    func check(_ allowed: Set<String>) throws {
        for key in values.keys where !allowed.contains(key) { throw Failure("Unknown option: \(key)") }
    }
    func number(_ key: String, default fallback: Double, range: ClosedRange<Double>) throws -> Double {
        guard let value = Double(values[key] ?? String(fallback)), value.isFinite,
              range.contains(value) else { throw Failure("\(key) must be in \(range)") }
        return value
    }
    func required(_ key: String) throws -> String {
        guard let value = values[key], !value.isEmpty else { throw Failure("Missing \(key)") }
        return value
    }
}

func json(_ object: Any, to url: URL? = nil) throws {
    let data = try JSONSerialization.data(withJSONObject: object, options: [.prettyPrinted, .sortedKeys])
    if let url = url { try data.write(to: url, options: .atomic) }
    else { print(String(decoding: data, as: UTF8.self)) }
}

// Refuse an existing destination so evidence is never silently replaced.
func destination(_ path: String) throws -> URL {
    let url = URL(fileURLWithPath: path, isDirectory: true)
    guard !FileManager.default.fileExists(atPath: url.path) else { throw Failure("Destination exists: \(path). Choose a fresh directory.") }
    try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
    return url
}

func cameras() -> [AVCaptureDevice] {
    AVCaptureDevice.DiscoverySession(deviceTypes: [.builtInWideAngleCamera, .external],
        mediaType: .video, position: .unspecified).devices
}

func waitUntil(_ seconds: Double, _ predicate: () -> Bool) -> Bool {
    let deadline = Date().addingTimeInterval(seconds)
    while !predicate() && Date() < deadline {
        RunLoop.current.run(until: Date().addingTimeInterval(0.02))
    }
    return predicate()
}

final class Recording: NSObject, AVCaptureFileOutputRecordingDelegate {
    private let lock = NSLock()
    private var didStart = false
    private var didFinish = false
    private var failure: Error?
    var started: Bool { lock.withLock { didStart } }
    var finished: Bool { lock.withLock { didFinish } }
    var error: Error? { lock.withLock { failure } }
    func fileOutput(_ output: AVCaptureFileOutput, didStartRecordingTo fileURL: URL,
                    from connections: [AVCaptureConnection]) {
        lock.withLock { didStart = true }
        print("RECORDING \(fileURL.path)")
        fflush(stdout)
    }
    func fileOutput(_ output: AVCaptureFileOutput, didFinishRecordingTo fileURL: URL,
                    from connections: [AVCaptureConnection], error: Error?) {
        if let error = error as NSError?,
           (error.userInfo[AVErrorRecordingSuccessfullyFinishedKey] as? Bool) != true {
            lock.withLock { failure = error }
        }
        lock.withLock { didFinish = true }
    }
}

func record(_ options: Options) throws {
    try options.check(["--camera", "--seconds", "--fps", "--out"])
    let id = try options.required("--camera")
    let seconds = try options.number("--seconds", default: 10, range: 1...60)
    let fps = try options.number("--fps", default: 30, range: 15...60)
    let path = try options.required("--out")
    guard !FileManager.default.fileExists(atPath: path) else { throw Failure("Destination already exists") }
    guard let device = cameras().first(where: { $0.uniqueID == id }) else {
        throw Failure("Camera not found. Run list and select its exact id.")
    }
    var authorized = AVCaptureDevice.authorizationStatus(for: .video) == .authorized
    if AVCaptureDevice.authorizationStatus(for: .video) == .notDetermined {
        var answered = false
        AVCaptureDevice.requestAccess(for: .video) { granted in
            DispatchQueue.main.async { authorized = granted; answered = true }
        }
        guard waitUntil(60, { answered }) else { throw Failure("Camera permission timed out; allow access and retry") }
    }
    guard authorized else { throw Failure("Camera access denied. Enable camera access for the launching app in System Settings > Privacy & Security > Camera, then retry.") }
    let session = AVCaptureSession()
    session.beginConfiguration()
    let input = try AVCaptureDeviceInput(device: device)
    guard session.canAddInput(input) else { throw Failure("Cannot attach camera input") }
    session.addInput(input)
    let formats = device.formats.filter { format in
        let size = CMVideoFormatDescriptionGetDimensions(format.formatDescription)
        return size.width >= 640 && size.width <= 1920 && format.videoSupportedFrameRateRanges.contains {
            $0.minFrameRate <= fps && $0.maxFrameRate >= fps
        }
    }.sorted { a, b in
        let x = CMVideoFormatDescriptionGetDimensions(a.formatDescription)
        let y = CMVideoFormatDescriptionGetDimensions(b.formatDescription)
        return abs(Int(x.width) - 1280) < abs(Int(y.width) - 1280)
    }
    guard let format = formats.first else { throw Failure("Camera has no 640–1920px format supporting \(fps) fps") }
    try device.lockForConfiguration()
    device.activeFormat = format
    let interval = CMTime(seconds: 1 / fps, preferredTimescale: 60000)
    device.activeVideoMinFrameDuration = interval
    device.activeVideoMaxFrameDuration = interval
    device.unlockForConfiguration()
    let movie = AVCaptureMovieFileOutput()
    guard session.canAddOutput(movie) else { throw Failure("Cannot attach movie output") }
    session.addOutput(movie)
    movie.maxRecordedDuration = CMTime(seconds: seconds, preferredTimescale: 600)
    session.commitConfiguration()
    let directory = try destination(path)
    let delegate = Recording()
    session.startRunning()
    defer { session.stopRunning() }
    movie.startRecording(to: directory.appendingPathComponent("capture.mov"), recordingDelegate: delegate)
    guard waitUntil(15, { delegate.started || delegate.finished }), delegate.started else {
        movie.stopRecording()
        throw delegate.error ?? Failure("Camera did not start within 15 seconds")
    }
    if !waitUntil(seconds + 15, { delegate.finished }) {
        movie.stopRecording()
        _ = waitUntil(10, { delegate.finished })
        throw Failure("Recording timed out; partial evidence may remain in \(path)")
    }
    if let error = delegate.error { throw error }
    try json(["camera": device.localizedName, "cameraID": device.uniqueID,
              "requestedFPS": fps, "requestedSeconds": seconds,
              "audio": false, "recordedAt": ISO8601DateFormatter().string(from: Date())],
             to: directory.appendingPathComponent("capture.json"))
    print("Saved \(directory.path)/capture.mov")
}

func roi(_ text: String?) throws -> CGRect {
    guard let text = text else { return CGRect(x: 0, y: 0, width: 1, height: 1) }
    let values = text.split(separator: ",").compactMap { Double($0) }
    guard values.count == 4, values.allSatisfy({ $0.isFinite }),
          values[0] >= 0, values[1] >= 0, values[2] > 0, values[3] > 0,
          values[0] + values[2] <= 1, values[1] + values[3] <= 1 else {
        throw Failure("--roi is normalized top-left x,y,width,height, contained within 0…1")
    }
    return CGRect(x: values[0], y: values[1], width: values[2], height: values[3])
}

func writeSheet(_ images: [(CGImage, Double)], index: Int, directory: URL) throws {
    let columns = 6, cellW = 240, cellH = 204
    let rows = (images.count + columns - 1) / columns
    let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: columns * cellW,
                                 pixelsHigh: rows * cellH, bitsPerSample: 8, samplesPerPixel: 4,
                                 hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
                                 bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
    NSColor.black.setFill()
    NSRect(x: 0, y: 0, width: columns * cellW, height: rows * cellH).fill()
    for (i, item) in images.enumerated() {
        let x = CGFloat((i % columns) * cellW)
        let y = CGFloat((rows - 1 - i / columns) * cellH)
        let image = NSImage(cgImage: item.0, size: .zero)
        let scale = min(232 / CGFloat(item.0.width), 176 / CGFloat(item.0.height))
        let size = CGSize(width: CGFloat(item.0.width) * scale, height: CGFloat(item.0.height) * scale)
        image.draw(in: CGRect(x: x + (240 - size.width) / 2, y: y + 24, width: size.width, height: size.height))
        (String(format: "%.4f s", item.1) as NSString).draw(at: CGPoint(x: x + 6, y: y + 3),
            withAttributes: [.foregroundColor: NSColor.white, .font: NSFont.monospacedSystemFont(ofSize: 12, weight: .regular)])
    }
    NSGraphicsContext.restoreGraphicsState()
    guard let data = bitmap.representation(using: .png, properties: [:]) else { throw Failure("Cannot encode sheet") }
    try data.write(to: directory.appendingPathComponent(String(format: "sequence-%03d.png", index)))
}

func analyze(_ options: Options) throws {
    try options.check(["--input", "--out", "--roi", "--start", "--seconds"])
    let crop = try roi(options.values["--roi"])
    let start = try options.number("--start", default: 0, range: 0...3600)
    let seconds = try options.number("--seconds", default: 5, range: 0.1...15)
    let asset = AVURLAsset(url: URL(fileURLWithPath: try options.required("--input")))
    guard let track = asset.tracks(withMediaType: .video).first else { throw Failure("No video track") }
    let reader = try AVAssetReader(asset: asset)
    let output = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
    reader.add(output)
    guard reader.startReading() else { throw reader.error ?? Failure("Cannot read video") }
    let directory = try destination(options.required("--out"))
    let context = CIContext()
    var timestamps: [Double] = [], selected: [(CGImage, Double)] = []
    var sheet = 0, reviewFrames = 0
    var origin: Double?
    while let sample = output.copyNextSampleBuffer() {
        try autoreleasepool {
            let pts = CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sample))
            guard pts.isFinite else { throw Failure("Invalid video timestamp") }
            if origin == nil { origin = pts }
            let time = pts - origin!
            timestamps.append(time)
            guard time >= start, time < start + seconds,
                  let buffer = CMSampleBufferGetImageBuffer(sample) else { return }
            let source = CIImage(cvPixelBuffer: buffer).transformed(by: track.preferredTransform)
            let bounds = source.extent
            let rect = CGRect(x: bounds.minX + crop.minX * bounds.width,
                              y: bounds.minY + (1 - crop.maxY) * bounds.height,
                              width: crop.width * bounds.width, height: crop.height * bounds.height).integral
            guard let image = context.createCGImage(source, from: rect) else { throw Failure("Cannot crop video frame") }
            if reviewFrames == 0 {
                guard let preview = NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:]) else {
                    throw Failure("Cannot encode framing preview")
                }
                try preview.write(to: directory.appendingPathComponent("preview.png"))
            }
            selected.append((image, time))
            reviewFrames += 1
            if selected.count == 30 {
                try writeSheet(selected, index: sheet, directory: directory)
                sheet += 1
                selected.removeAll()
            }
        }
    }
    guard reader.status == .completed else { throw reader.error ?? Failure("Video decoding failed") }
    guard timestamps.count >= 2, reviewFrames > 0 else { throw Failure("Not enough frames, or selected interval is outside the recording") }
    if !selected.isEmpty { try writeSheet(selected, index: sheet, directory: directory); sheet += 1 }
    let deltas = zip(timestamps.dropFirst(), timestamps).map(-)
    let sorted = deltas.sorted()
    let median = sorted[sorted.count / 2]
    guard median > 0, timestamps.last! > 0 else { throw Failure("Video has no positive time span/cadence") }
    let gaps = deltas.enumerated().filter { $0.element > median * 1.5 }.map {
        ["afterSeconds": timestamps[$0.offset], "gapSeconds": $0.element]
    }
    try ("frame,seconds,delta_seconds\n" + timestamps.enumerated().map { i, t in
        String(format: "%d,%.6f,%.6f", i, t, i == 0 ? 0 : deltas[i - 1])
    }.joined(separator: "\n") + "\n").write(to: directory.appendingPathComponent("frames.csv"), atomically: true, encoding: .utf8)
    try json(["input": asset.url.path, "frameCount": timestamps.count,
              "durationBetweenFirstAndLastFrame": timestamps.last!,
              "observedFPS": Double(timestamps.count - 1) / timestamps.last!,
              "medianFrameIntervalSeconds": median, "maxFrameIntervalSeconds": sorted.last!,
              "nonIncreasingTimestamps": deltas.filter { $0 <= 0 }.count,
              "captureGapsOver1_5xMedian": gaps, "reviewFrames": reviewFrames, "sheets": sheet,
              "reviewStartSeconds": start, "reviewSeconds": seconds,
              "roiTopLeftNormalized": [crop.minX, crop.minY, crop.width, crop.height],
              "verdict": "unreviewed",
              "limitations": "Video timestamps measure capture cadence, not firmware FPS. Review motion visually; exposure, focus, rolling shutter and display refresh can hide or imitate stutter."],
             to: directory.appendingPathComponent("report.json"))
    print("Saved \(reviewFrames) consecutive review frames in \(sheet) sheets to \(directory.path)")
}

do {
    let options = try Options(Array(CommandLine.arguments.dropFirst()))
    switch options.command {
    case "list":
        try options.check([])
        try json(cameras().map { ["id": $0.uniqueID, "name": $0.localizedName] })
    case "record": try record(options)
    case "analyze": try analyze(options)
    case "help", "--help":
        print("""
        webcam list
        webcam record --camera ID --out DIRECTORY [--seconds 10] [--fps 30]
        webcam analyze --input MOVIE --out DIRECTORY [--roi x,y,w,h] [--start 0] [--seconds 5]
        Camera ID comes from list. ROI uses normalized coordinates from the top-left.
        Records video only; destinations must be new. Analysis preserves every frame in the selected interval.
        """)
    default: throw Failure("Unknown command: \(options.command)")
    }
} catch {
    fputs("webcam: \(error)\n", stderr)
    exit(1)
}
