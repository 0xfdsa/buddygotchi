import Foundation
import XCTest
@testable import BoopKit

/// Only the everyday Boop, on its own folder, installs or
/// repairs hooks, since they report to its socket.
final class StateDirTests: XCTestCase {
    func testOnlyTheEverydayFolderOwnsTheHooks() throws {
        let home = tempDir("home")
        defer { try? FileManager.default.removeItem(at: home) }
        let everyday = AppSettings.defaultStateDir(home: home.path)
        try FileManager.default.createDirectory(at: everyday, withIntermediateDirectories: true)
        XCTAssertTrue(AppSettings.isEveryday(everyday, home: home.path))
        XCTAssertTrue(AppSettings.isEveryday(URL(fileURLWithPath: everyday.path + "/../Boop/"), home: home.path))
        let link = home.appendingPathComponent("boop-link")
        try FileManager.default.createSymbolicLink(at: link, withDestinationURL: everyday)
        XCTAssertTrue(AppSettings.isEveryday(link, home: home.path), "a symlink to it is the same folder")
        XCTAssertFalse(AppSettings.isEveryday(home.appendingPathComponent("debug-state"), home: home.path))
    }

    /// A launch that finds `boop.log` past 5 MB moves
    /// it to `boop.1.log`, replacing the one there, but only while it holds
    /// the folder's lock, which it lets go again for the runtime: a second
    /// copy started on a running app's folder leaves that app's log alone.
    func testALogPastFiveMegabytesMovesAsideOnlyUnderTheLock() throws {
        XCTAssertEqual(BoopLog.maxBytes, 5 << 20)
        let dir = tempDir("boop-log")
        defer { try? FileManager.default.removeItem(at: dir) }
        let log = dir.appendingPathComponent("boop.log")
        let kept = dir.appendingPathComponent("boop.1.log")
        func size(_ url: URL) -> UInt64? { (try? FileManager.default.attributesOfItem(atPath: url.path))?[.size] as? UInt64 }
        try Data(count: Int(BoopLog.maxBytes)).write(to: log)
        XCTAssertFalse(BoopLog.rotate(in: dir), "5 MB exactly stays")
        XCTAssertEqual(size(log), BoopLog.maxBytes)

        try Data("an older launch\n".utf8).write(to: kept)
        try Data(count: Int(BoopLog.maxBytes) + 1).write(to: log)
        do {
            let running = try XCTUnwrap(InstanceLock(directory: dir))
            try withExtendedLifetime(running) {
                XCTAssertFalse(BoopLog.rotate(in: dir), "another copy runs on this folder")
                XCTAssertEqual(size(log), BoopLog.maxBytes + 1)
                try XCTAssertEqual(try Data(contentsOf: kept), Data("an older launch\n".utf8))
            }
        }

        XCTAssertTrue(BoopLog.rotate(in: dir))
        XCTAssertNil(size(log), "the launch starts a new one")
        XCTAssertEqual(size(kept), BoopLog.maxBytes + 1)
        XCTAssertNotNil(InstanceLock(directory: dir), "the runtime can take the lock")
    }
}
