import Foundation

/// Splits a byte stream into lines (SPEC.md §2). A line can arrive in
/// several Bluetooth packets or serial reads; it's complete at `\n`, a
/// trailing `\r` is dropped and empty lines are skipped. A line longer than
/// `maxLine` is dropped whole, so a screenshot passing through the USB
/// bridge can't grow the buffer without bound.
public struct LineFramer: Sendable {
    public let maxLine: Int
    var buffer: [UInt8] = []
    var skipping = false

    /// `maxLine` is well over the protocol's 512 bytes, since `dbg.*`
    /// replies over USB may be longer (SPEC.md §7).
    public init(maxLine: Int = 4096) {
        self.maxLine = maxLine
    }

    /// The lines `bytes` completes, without their newlines.
    public mutating func push<Bytes: Sequence>(_ bytes: Bytes) -> [String] where Bytes.Element == UInt8 {
        var lines: [String] = []
        for byte in bytes {
            if byte == 0x0A {
                if !skipping {
                    if buffer.last == 0x0D { buffer.removeLast() }
                    if !buffer.isEmpty { lines.append(String(decoding: buffer, as: UTF8.self)) }
                }
                buffer.removeAll(keepingCapacity: true)
                skipping = false
            } else if !skipping {
                buffer.append(byte)
                if buffer.count > maxLine {
                    buffer.removeAll(keepingCapacity: true)
                    skipping = true
                }
            }
        }
        return lines
    }

    /// `line` and its newline cut into pieces of at most `size` bytes, for
    /// Bluetooth writes (SPEC.md §8).
    public static func chunks(_ line: String, size: Int) -> [Data] {
        var data = Data(line.utf8)
        data.append(0x0A)
        let size = max(1, size)
        return stride(from: 0, to: data.count, by: size).map { data.subdata(in: $0..<min(data.count, $0 + size)) }
    }
}
