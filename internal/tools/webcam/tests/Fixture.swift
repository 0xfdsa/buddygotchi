import AppKit
import AVFoundation

// A two-second, 30 fps moving square, with one deliberately missing frame.
let url = URL(fileURLWithPath: CommandLine.arguments[1])
let writer = try AVAssetWriter(outputURL: url, fileType: .mov)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: 320, AVVideoHeightKey: 240
])
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input,
    sourcePixelBufferAttributes: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
                                 kCVPixelBufferWidthKey as String: 320, kCVPixelBufferHeightKey as String: 240])
writer.add(input)
precondition(writer.startWriting())
writer.startSession(atSourceTime: .zero)
for i in 0..<60 where i != 30 {
    while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.001) }
    var pixel: CVPixelBuffer?
    precondition(CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pixel) == kCVReturnSuccess)
    let buffer = pixel!
    CVPixelBufferLockBaseAddress(buffer, [])
    let context = CGContext(data: CVPixelBufferGetBaseAddress(buffer), width: 320, height: 240,
        bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
        space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)!
    context.setFillColor(CGColor(red: 0, green: 0, blue: 0, alpha: 1))
    context.fill(CGRect(x: 0, y: 0, width: 320, height: 240))
    context.setFillColor(CGColor(red: 0.2, green: 1, blue: 0.4, alpha: 1))
    context.fill(CGRect(x: 30 + i * 3, y: 130, width: 25, height: 25))
    CVPixelBufferUnlockBaseAddress(buffer, [])
    precondition(adaptor.append(buffer, withPresentationTime: CMTime(value: Int64(i), timescale: 30)))
}
input.markAsFinished()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
precondition(writer.status == .completed, String(describing: writer.error))
