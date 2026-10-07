import AppKit
import BoopKit
import Foundation
import WebKit

/// Real WKWebView rendering of bundled assets, with an injected fixed clock.
/// The bounded wait belongs only to this command, never the runtime.
@MainActor
enum SlimeSnapshots {
    static let timeout: TimeInterval = 15
    static func image(_ snapshot: StateSnapshot, to output: URL, size: NSSize = NSSize(width: 640, height: 480)) throws -> NSImage {
        let feed = SlimeFeed(), view = SlimeView.webView()
        let window = NSWindow(contentRect: NSRect(x: -2000, y: 0, width: size.width, height: size.height),
                              styleMask: .borderless, backing: .buffered, defer: false)
        window.isReleasedWhenClosed = false
        window.contentView = view
        window.orderFront(nil)
        defer { feed.detach(view); window.close() }
        var image: NSImage?, failure: String?
        feed.didFail = { failure = $0 }
        feed.didLoad = {
            view.callAsyncJavaScript("return window.BoopSlime.snapshot(value)",
                                     arguments: ["value": SlimeFeed.object(snapshot.fields)], in: nil, in: .page) { result in
                switch result {
                case .failure(let error): failure = error.localizedDescription
                case .success(let raw):
                    guard let info = raw as? [String: String], info["state"] == snapshot.visual else {
                        failure = "slime snapshot did not render the requested facts: \(raw)"; return
                    }
                    view.takeSnapshot(with: nil) { result, error in
                        if let error { failure = error.localizedDescription }
                        image = result
                    }
                }
            }
        }
        feed.attach(view)
        let deadline = Date().addingTimeInterval(timeout)
        while image == nil, failure == nil, Date() < deadline { RunLoop.current.run(until: Date().addingTimeInterval(0.01)) }
        guard let image, let data = image.tiffRepresentation, let bitmap = NSBitmapImageRep(data: data),
              let png = bitmap.representation(using: .png, properties: [:]) else {
            throw NSError(domain: "SlimeSnapshots", code: 1,
                          userInfo: [NSLocalizedDescriptionKey: failure ?? "WebKit did not render within \(timeout) seconds"])
        }
        try png.write(to: output)
        print("\(output.lastPathComponent) \(bitmap.pixelsWide)×\(bitmap.pixelsHigh), real bundled WebKit render")
        return image
    }
}
