import Foundation
import XCTest
@testable import BoopKit

/// VERIFICATION.md §2: `Boop` and `boopdev` take only the flags their usage
/// lists, and stop on anything else.
final class ArgumentsTests: XCTestCase {
    func testOptionsFlagsAndWords() throws {
        let a = try Arguments(["run.jsonl", "--gap-ms", "0", "--states"], options: ["--gap-ms", "--agent"], flags: ["--states"], words: 1)
        XCTAssertEqual(a.words, ["run.jsonl"])
        XCTAssertEqual(a["--gap-ms"], "0")
        XCTAssertNil(a["--agent"])
        XCTAssertTrue(a.has("--states"))
        XCTAssertFalse(a.help)
    }

    /// A mistyped flag stops the command: `Boop --headles` must not start
    /// the menu-bar app, and `boopdev eval --onyl 03` must not run them all.
    func testUnknownFlagsStop() throws {
        try XCTAssertThrowsError(try Arguments(["--headles", "--state-dir", "/tmp/x"], options: ["--state-dir"])) {
            XCTAssertEqual("\($0)", "unknown option --headles")
        }
        try XCTAssertThrowsError(try Arguments(["-v"], flags: ["--debug"]))
    }

    func testAnOptionNeedsItsValue() throws {
        try XCTAssertThrowsError(try Arguments(["--state-dir"], options: ["--state-dir"])) {
            XCTAssertEqual("\($0)", "--state-dir needs a value")
        }
        try XCTAssertThrowsError(try Arguments(["--state-dir", "--debug"], options: ["--state-dir"], flags: ["--debug"]))
        try XCTAssertEqual(try Arguments(["--start", "-5"], options: ["--start"])["--start"], "-5")
    }

    func testExtraWordsStop() throws {
        try XCTAssertThrowsError(try Arguments(["eval", "now"], words: 1)) { XCTAssertEqual("\($0)", "unexpected now") }
        try XCTAssertEqual(try Arguments(["a", "b", "c"], words: .max).words, ["a", "b", "c"])
    }

    /// Help wins over everything else, so `--help` never runs the command.
    func testHelpAnywhere() throws {
        try XCTAssertTrue(try Arguments(["--real", "--help", "extra"], flags: ["--real"]).help)
        try XCTAssertTrue(try Arguments(["-h"]).help)
        try XCTAssertThrowsError(try Arguments(["--help", "--rael"], flags: ["--real"]))
    }
}
