import AgentHooks
import Foundation
import MellowHarness

/// Boop's view of an event: what MellowHarness's event
/// holds for Boop. An agent's hook, a poke, what
/// you said, away and back, a heartbeat and "needs you" are each a type,
/// and a type with a lifetime a phase: the event's `kind` is the two
/// together (`tool_end`, `poke`). The source's own name for it, the
/// session, subagent and working directory are in `data`. MellowHarness's own
/// events (`did`, `ended`, `pass`) have no type.
extension Event {
    /// Where it came from.
    public enum Source: String, Sendable {
        case claude, codex, device, clock, boop
        /// The Mac's microphone: what you said to Boop.
        case mic
        /// The Mac itself: you stepping away and coming back, as the
        /// presence detector decides.
        case mac

        /// An agent's events' source: its own name.
        public init(_ agent: Agent) { self.init(rawValue: agent.rawValue)! }
    }

    /// What it is, whatever agent it came from.
    public enum Kind: String, Sendable, CaseIterable {
        case session, turn, tool, subagent, poke, talk, presence, heartbeat
        /// "Needs you" showing for a session, and clearing: the core's.
        case needsYou = "needs_you"
    }

    /// Where in its life a thing with a start and an end is: a tool call
    /// can also `wait` on you. Nil for one that just happens.
    public enum Phase: String, Sendable {
        case start, wait, end
    }

    /// The `data` keys Boop's own fields take.
    static let metaKeys: Set<String> = ["specific_type", "session", "subagent", "cwd"]

    public init(seq: Int = 0, ts: Int64, source: Source, type: Kind, phase: Phase? = nil, specificType: String,
                session: String? = nil, subagent: String? = nil, cwd: String? = nil, data: [String: JSONValue] = [:]) {
        var data = data
        data["specific_type"] = .string(specificType)
        if let session { data["session"] = .string(session) }
        if let subagent { data["subagent"] = .string(subagent) }
        if let cwd { data["cwd"] = .string(cwd) }
        self.init(seq: seq, at: ts, source: source.rawValue, kind: Event.kind(type, phase), data: data)
    }

    /// A type and phase's `kind`: `tool_end`, `poke`.
    public static func kind(_ type: Kind, _ phase: Phase?) -> String {
        phase.map { "\(type.rawValue)_\($0.rawValue)" } ?? type.rawValue
    }

    /// When it happened, in unix milliseconds: its `at`.
    public var ts: Int64 {
        get { at }
        set { at = newValue }
    }

    /// Where it came from, for one of Boop's sources.
    public var from: Source? { Source(rawValue: source) }

    /// Its type and phase, from its `kind`; nil for MellowHarness's own events.
    public var type: Kind? { Event.split(kind).type }
    public var phase: Phase? { Event.split(kind).phase }

    static func split(_ kind: String) -> (type: Kind?, phase: Phase?) {
        if let type = Kind(rawValue: kind) { return (type, nil) }
        guard let cut = kind.lastIndex(of: "_"), let type = Kind(rawValue: String(kind[..<cut])),
              let phase = Phase(rawValue: String(kind[kind.index(after: cut)...])) else { return (nil, nil) }
        return (type, phase)
    }

    /// The source's own name for it: `PreToolUse`, `Interrupt`, `input`.
    public var specificType: String { data["specific_type"]?.string ?? "" }
    /// The agent's session; for "needs you", the session's.
    public var session: String? { data["session"]?.string }
    /// The Claude subagent it came from, by `agent_id`.
    public var subagent: String? { data["subagent"]?.string }
    public var cwd: String? { data["cwd"]?.string }

    /// The agent it came from, for an agent's event.
    public var agent: Agent? { Agent(rawValue: source) }

    /// `turn end`, `poke`: its type and phase, or its kind for MellowHarness's
    /// own.
    public var name: String {
        type.map { t in [t.rawValue, phase?.rawValue].compactMap { $0 }.joined(separator: " ") } ?? kind
    }

    /// `12 tool end PostToolUse claude s1 · tool Bash, failed true`, for
    /// debug mode and replays.
    public var summary: String {
        let what = [type.map { [$0.rawValue, phase?.rawValue].compactMap { $0 }.joined(separator: " ") } ?? kind,
                    specificType.isEmpty ? action : specificType, source, session].compactMap { $0 }
        let facts = data.keys.sorted().filter { !Event.metaKeys.contains($0) && $0 != "action" }.compactMap { key -> String? in
            guard let value = data[key] else { return nil }
            switch value {
            case .string(let s): return "\(key) \(s.count > 60 ? String(s.prefix(60)) + "…" : s)"
            case .int(let n): return "\(key) \(n)"
            case .bool(let b): return "\(key) \(b)"
            default: return nil
            }
        }
        return what.joined(separator: " ") + (facts.isEmpty ? "" : " · " + facts.joined(separator: ", "))
    }

    /// `value` as JSON, keys sorted: a string comes back quoted.
    static func json(_ value: Any) -> String { JSONLine.encode(value) }

    /// A transcript line from before MellowHarness:
    /// `ts`, `type`, `phase`, `specific_type`, `session`, `subagent` and
    /// `cwd` at the top, and actions as a type of their own. Read so a
    /// launch just after the change picks up where the last one left.
    public static func legacy(_ line: some StringProtocol) -> Event? {
        guard let o = try? JSONSerialization.jsonObject(with: Data(line.utf8)) as? [String: Any],
              let seq = (o["seq"] as? NSNumber)?.intValue, let ts = (o["ts"] as? NSNumber)?.int64Value,
              let source = o["source"] as? String, let type = o["type"] as? String,
              let specific = o["specific_type"] as? String else { return nil }
        var data = (o["data"] as? [String: Any] ?? [:]).mapValues { JSONValue(foundation: $0) }
        let phase = o["phase"] as? String
        if type == "action" {
            if specific == Core.needsYou {
                if let session = o["session"] as? String { data["session"] = .string(session) }
                data["specific_type"] = .string(specific)
                return Event(seq: seq, at: ts, source: Source.boop.rawValue,
                             kind: phase == "end" ? "needs_you_end" : "needs_you_start", data: data)
            }
            data["action"] = .string(specific)
            if phase == "end" { return Event(seq: seq, at: ts, source: Event.harness, kind: Event.ended, data: data) }
            // A mood change said what it changed from and to only in its
            // message; the mood is its latest `to` now.
            if specific == MoodAction.actionName, let message = data["message"]?.string,
               let said = message.range(of: "'s mood changed: "), message.hasSuffix(".") {
                // "<name>'s mood changed: from → to.", the name the character's.
                let parts = message[said.upperBound...].dropLast().components(separatedBy: " → ")
                if parts.count == 2 {
                    data["from"] = .string(parts[0])
                    data["to"] = .string(parts[1])
                }
            }
            if phase == "start" { data["open"] = true }
            return Event(seq: seq, at: ts, source: Event.harness, kind: Event.did, data: data)
        }
        data["specific_type"] = .string(specific)
        for key in ["session", "subagent", "cwd"] {
            if let value = o[key] as? String { data[key] = .string(value) }
        }
        return Event(seq: seq, at: ts, source: source, kind: phase.map { "\(type)_\($0)" } ?? type, data: data)
    }
}

/// Numbers named, so no brain has to compare them.
public enum Band {
    /// A turn's length or a tool call's time, as the moods read it: short
    /// under a minute, long under 5 minutes, very long past that.
    public static func length(ms: Int64) -> String {
        ms < 60_000 ? "short" : ms < 5 * 60_000 ? "long" : "very long"
    }

    /// How long you were away from the Mac: short under 15 minutes, long
    /// under 2 hours, very long past that.
    public static func away(ms: Int64) -> String {
        ms < 15 * 60_000 ? "short" : ms < 2 * 60 * 60_000 ? "long" : "very long"
    }
}
