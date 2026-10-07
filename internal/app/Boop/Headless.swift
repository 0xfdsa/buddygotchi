import AgentHooks
import BoopKit
import Foundation
import MellowHarness
import os

/// `Boop --headless`: the whole runtime with isolated state, no UI and no
/// Bluetooth. The device, if any, is reached through `boopctl bridge`.
enum Headless {
    static func run(_ args: Arguments) -> Never {
        guard let dir = args["--state-dir"] else { fail("--headless needs --state-dir\n" + usage) }
        let stateDir = URL(fileURLWithPath: dir).standardizedFileURL
        guard let link = LinkSetting(args["--link"] ?? "none") else { fail("--link is usb:SOCKET or none") }
        if link == .bluetooth { fail("headless mode never uses Bluetooth; use --link usb:SOCKET") }
        let socketPath = args["--socket"] ?? stateDir.appendingPathComponent("boop.sock").path
        // Checked before anything is set up, as the hook server checks it: a
        // Unix socket's path has room for 103 bytes (sockaddr_un), and a
        // scratch directory is often longer.
        if HookSocket.unixAddress(socketPath) == nil {
            let room = MemoryLayout.size(ofValue: sockaddr_un().sun_path) - 1
            fail("the hook socket \(socketPath) is \(socketPath.utf8.count) bytes, and a Unix socket's path "
                 + "has room for \(room): pass --socket with a shorter one")
        }
        // Every value is checked before anything is written, so a typo
        // doesn't leave a set-up Boop behind for the next run to keep.
        let personality = args.choice("--personality", of: Personality.allCases.map(\.rawValue)).flatMap(Personality.init(rawValue:))
        let brain = args.choice("--brain", of: ["jev", "scripted"]) ?? "jev"
        guard let nature = LongTerm.Nature(rawValue: args["--nature"] ?? "sweet") else { fail("--nature is sweet or cheeky") }
        let log = LogFile(directory: stateDir, echo: true)

        let memory = try? MemoryStore(directory: stateDir, log: { log.write($0) })
        if memory?.isSetUp != true {
            let name = args["--name"] ?? "Boop"
            do {
                try Runtime.setUp(stateDir: stateDir, name: name, nature: nature)
                log.write("boop: set up \(name) (\(nature.rawValue)) in \(stateDir.path)")
            } catch {
                fail("can't set up \(stateDir.path): \(error)")
            }
        }

        // Headless always takes the dashboard's lines.
        var options = runtimeOptions(stateDir: stateDir, socketPath: socketPath, link: link, debug: args.has("--debug"),
                                     devLines: true, log: log)
        // Jev's key only from BOOP_JEV_KEY, as boopdev: a run from an agent
        // shell must never use the owner's key from the Keychain.
        options.readJevKey = { _ in JevKey.environment() }
        if brain == "scripted" { options.brain = { _ in ScriptedBrain.pipelineCheck } }
        // The clock can be moved forward with `{"dev":"advance","ms":N}`, so
        // the pipeline check can finish a 6-minute turn without waiting it out.
        let skew = OSAllocatedUnfairLock(initialState: Int64(0))
        let (clock, wallClock) = (options.clock, options.wallClock)
        options.clock = { clock() + skew.withLock { $0 } }
        options.wallClock = { wallClock() + skew.withLock { $0 } }
        options.advance = { ms in skew.withLock { $0 += ms } }
        // A tap while something needs you opens the thread on this Mac;
        // agents' runs only log where.
        if args.has("--no-open") { options.open = { _ in log.write("open: skipped (--no-open)"); return true } }
        if let personality { options.personality = personality }
        let runtime: Runtime
        do {
            runtime = try Runtime(options)
            try runtime.start()
        } catch {
            fail("boop: \(error)")
        }

        // Stop cleanly: close the socket and the link, then exit 0.
        var sources: [DispatchSourceSignal] = []
        for sig in [SIGINT, SIGTERM] {
            signal(sig, SIG_IGN)
            let source = DispatchSource.makeSignalSource(signal: sig, queue: .main)
            source.setEventHandler {
                log.write("boop: stopping (signal \(sig))")
                runtime.stop()
                runtime.home.sync {}
                log.write("boop: stopped")
                exit(0)
            }
            source.resume()
            sources.append(source)
        }
        withExtendedLifetime(sources) { dispatchMain() }
    }
}
