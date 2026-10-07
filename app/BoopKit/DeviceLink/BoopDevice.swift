import Foundation
import LinkKit

/// Boop's vocabulary on LinkKit (linkkit/SPEC.md is the
/// protocol under it): what Boop calls its device, the names it plays
/// beside the moments' own (`DeviceMoment`), and what its `hello` and taps
/// mean to the app. The link itself, with its ids, `ended`s and transports,
/// is LinkKit's `DeviceLink`.
public enum BoopDevice {
    /// The `hello.app` of Boop's firmware.
    public static let app = "boop"
    /// Over Bluetooth the device advertises as `Boop-XXXX`.
    public static let blePrefix = "Boop"
    /// Push-to-talk's face after the Mac's Talk button, and its end when no
    /// reply is coming.
    public static let listening = "listening", stopListening = "stop_listening"
    /// Why the device drops the reactions waiting when push-to-talk starts:
    /// a reaction would end `listening`.
    public static let micOn = "mic_on"
    /// How long a brain reaction may wait on the device for its turn: a
    /// late reaction is worse than none.
    public static let reactionTTL = 5000

    /// The link to Boop's device over `transport`, or to none.
    public static func link(_ transport: Transport?, log: @escaping (String) -> Void = { _ in }) -> DeviceLink {
        DeviceLink(app: app, transport: transport, log: log)
    }

    /// The face a `hello` line says the device draws, for
    /// the `state` the link sends in answer, which goes out inside
    /// `receive`, before `onHello`; nil for any other line. A `hello` the
    /// link turns away (another `kit` or `app`, linkkit/SPEC.md §6) means
    /// pixel. LinkKit's rule for which fit isn't public, so a link with no
    /// transport, which sends nothing, judges the line: the rule itself,
    /// never a copy that could drift from it.
    public static func face(saying line: String) -> DeviceInfo.Face? {
        // Every device line passes through here: only a hello, which comes
        // on connect and once a minute, is worth a link to judge it.
        guard case .hello = Wire.decode(line) else { return nil }
        let judge = link(nil)
        guard case .hello = judge.receive(line, now: 0) else { return nil }
        return judge.hello.map { DeviceInfo($0).face } ?? .pixel
    }

    /// The `do` id of the brain's finish a tap landed on, when the device
    /// says so (`data.on`): it only dipped the face, and
    /// the tap opens that thread.
    public static func finish(tapped ev: DeviceEvent) -> Int? {
        guard let on = ev.data["on"]?.int, (1...Wire.maxId).contains(on) else { return nil }
        return on
    }

    /// Who Boop's firmware from before LinkKit says it is, in the `status`
    /// it sends where a `hello` would be; nil for any
    /// other line. Such firmware is too old for the app (`DeviceLink.Trouble.tooOld`),
    /// which the app spots itself (linkkit/SPEC.md §6).
    public static func fromBeforeTheKit(_ line: String) -> DeviceInfo? {
        guard let o = JSON.parse(line)?.object, o["t"]?.string == "status" else { return nil }
        return DeviceInfo(id: o["id"]?.string ?? "", fw: o["fw"]?.string ?? "", voice: o["voice"]?.string)
    }
}

/// What Boop's device says of itself in its `hello`.
public struct DeviceInfo: Equatable, Sendable {
    /// `b00p-7f3a`: which Boop this body is.
    public var id: String
    public var fw: String
    /// The version of the voice pack on its card, `none`
    /// with no card or none readable, or nil from firmware that doesn't say.
    public var voice: String?
    public enum Face: String, Sendable { case pixel, gel }
    public var face: Face

    public init(id: String, fw: String, voice: String? = nil, face: Face = .pixel) {
        self.id = id
        self.fw = fw
        self.voice = voice
        self.face = face
    }

    public init(_ hello: Hello) {
        self.init(id: hello.id, fw: hello.fw, voice: hello.fields["voice"]?.string,
                  face: hello.fields["face"]?.string.flatMap(Face.init(rawValue:)) ?? .pixel)
    }

    /// Whether it plays the takes the app picks from: its card has the
    /// same pack as `Take.all`, or it doesn't say.
    public var hasTheVoice: Bool { voice.map { $0 == Take.packVersion } ?? true }

    /// What the log says when it says hello: who it is, and when its
    /// card's voice isn't the app's.
    var logLines: [String] {
        ["device: \(id) firmware \(fw)" + (voice.map { " voice \($0)" } ?? "")]
            + (hasTheVoice ? [] : ["device: its card's voice is \(voice!), the app's \(Take.packVersion): "
                                   + "Boop says nothing until they match"])
    }
}

/// `--link` values: `usb:<bridge socket>`, `ble` or `none`.
public enum LinkSetting: Equatable, Sendable {
    case usb(String)
    case bluetooth
    case none

    public init?(_ text: String) {
        if text.hasPrefix("usb:"), text.count > 4 {
            self = .usb(String(text.dropFirst(4)))
        } else if text == "ble" {
            self = .bluetooth
        } else if text == "none" {
            self = .none
        } else {
            return nil
        }
    }
}

extension DeviceLink.Sender {
    /// Who asked for a line, for `debug.jsonl`'s `by` and boop.log: the
    /// core's rules (every `state`, the one-shots, push-to-talk), or the
    /// brain's reactions.
    public static let rule: Self = "rule"
    public static let brain: Self = "brain"
}
