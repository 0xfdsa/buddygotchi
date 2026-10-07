import Foundation

/// v3's moods, read from the character pack (characters/CHARACTER.md
/// §5): its `moods` and `pacing`, which slimegen writes into Boop's pack
/// from the slime design. This goes when Boop's pack takes v3 alone.
public enum MoodGraphV3 {
    public struct Node: Sendable {
        public let meaning: String
        public let family: String
        public let fallback: String
        public let brief: Bool
        public let moves: MoodGraph.Moves
    }
    public static var moods: [String] { CharacterPack.active.moods.map(\.id) }
    public static var nodes: [String: Node] { CharacterPack.active.nodesV3 }
    public static var ordinaryDwellMs: Int64 { CharacterPack.active.pacing.ordinaryDwellMs }
    public static var reverseCooldownMs: Int64 { CharacterPack.active.pacing.reverseCooldownMs }
    public static var briefExitMs: Int64 { CharacterPack.active.pacing.briefExitMs }
    public static var freshEvidenceMs: Int64 { CharacterPack.active.pacing.freshEvidenceMs }
}
