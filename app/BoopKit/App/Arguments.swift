import Foundation

/// A command line checked against what a command takes (VERIFICATION.md
/// §2). Anything else stops the command, so a typo can't be ignored and run
/// something else: `Boop --headles` would otherwise start the menu-bar app.
public struct Arguments: Sendable {
    public struct Problem: Error, CustomStringConvertible, Equatable {
        public var description: String
    }

    /// The words that aren't flags or their values, in order.
    public private(set) var words: [String] = []
    /// `-h` or `--help` was given, anywhere.
    public private(set) var help = false
    private var values: [String: String] = [:]
    private var flags: Set<String> = []

    /// `options` take the next word as their value, and `flags` stand
    /// alone. At most `words` other words may come, in any position.
    public init(_ args: [String], options: Set<String> = [], flags: Set<String> = [], words: Int = 0) throws {
        var i = 0
        while i < args.count {
            let arg = args[i]
            if arg == "-h" || arg == "--help" {
                help = true
            } else if options.contains(arg) {
                guard i + 1 < args.count, !args[i + 1].hasPrefix("--") else { throw Problem(description: "\(arg) needs a value") }
                values[arg] = args[i + 1]
                i += 1
            } else if flags.contains(arg) {
                self.flags.insert(arg)
            } else if arg.hasPrefix("-"), arg.count > 1 {
                throw Problem(description: "unknown option \(arg)")
            } else {
                self.words.append(arg)
            }
            i += 1
        }
        // Help wins, so `boopdev eval --help` prints the usage whatever else is there.
        if !help, self.words.count > words {
            throw Problem(description: "unexpected \(self.words[words...].joined(separator: " "))")
        }
    }

    /// The value given for an option.
    public subscript(_ option: String) -> String? { values[option] }

    /// Whether a flag was given.
    public func has(_ flag: String) -> Bool { flags.contains(flag) }

    /// The value given for an option that takes one of `choices`, or nil if
    /// it isn't given. Any other value stops the command, naming them.
    public func choice(_ option: String, of choices: [String]) -> String? {
        guard let value = values[option] else { return nil }
        if !choices.contains(value) { fail("\(option) is " + choices.joined(separator: ", ")) }
        return value
    }

    /// A command's arguments, as every command takes them: --help prints
    /// `usage` and exits 0, and a problem prints `command:`, the problem and
    /// `usage` to stderr and exits 2.
    public static func parse(_ args: [String], options: Set<String> = [], flags: Set<String> = [], words: Int = 0,
                             command: String, usage: String) -> Arguments {
        do {
            let parsed = try Arguments(args, options: options, flags: flags, words: words)
            if parsed.help {
                print(usage)
                exit(0)
            }
            return parsed
        } catch {
            fail("\(command): \(error)\n\(usage)")
        }
    }
}

/// Prints `message` to stderr and exits 2: how the app's and boopdev's
/// commands stop on a problem.
public func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data((message + "\n").utf8))
    exit(2)
}
