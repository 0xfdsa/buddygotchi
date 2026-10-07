import Foundation

// The local runner executes test instances serially on the main actor.
@MainActor
open class XCTestCase {
    public required init() {}
    open func setUp() async throws {}
    open func tearDown() async throws {}
    open func setUpWithError() throws {}
    open func tearDownWithError() throws {}
}

public enum XCTestShimError: Error, CustomStringConvertible {
    case unwrapFailed(String)
    case skipped(String)

    public var description: String {
        switch self {
        case .unwrapFailed(let message):
            return message.isEmpty ? "XCTUnwrap failed" : message
        case .skipped(let message):
            return message.isEmpty ? "Skipped" : message
        }
    }
}

@inline(__always)
private func fail(_ message: String, file: StaticString, line: UInt) -> Never {
    fatalError(message.isEmpty ? "Assertion failed at \(file):\(line)" : "\(message) at \(file):\(line)")
}

public func XCTAssertEqual<T: Equatable>(
    _ expression1: @autoclosure () throws -> T,
    _ expression2: @autoclosure () throws -> T,
    _ message: @autoclosure () -> String = "",
    file: StaticString = #filePath,
    line: UInt = #line
) rethrows {
    let lhs = try expression1()
    let rhs = try expression2()
    if lhs != rhs {
        fail(message().isEmpty ? "XCTAssertEqual failed: \(lhs) is not equal to \(rhs)" : message(), file: file, line: line)
    }
}

public func XCTAssertNil<T>(
    _ expression: @autoclosure () throws -> T?,
    _ message: @autoclosure () -> String = "",
    file: StaticString = #filePath,
    line: UInt = #line
) rethrows {
    if let value = try expression() {
        fail(message().isEmpty ? "XCTAssertNil failed: \(value) is not nil" : message(), file: file, line: line)
    }
}

public func XCTAssertNotNil<T>(
    _ expression: @autoclosure () throws -> T?,
    _ message: @autoclosure () -> String = "",
    file: StaticString = #filePath,
    line: UInt = #line
) rethrows {
    if try expression() == nil {
        fail(message().isEmpty ? "XCTAssertNotNil failed" : message(), file: file, line: line)
    }
}

public func XCTAssertTrue(
    _ expression: @autoclosure () throws -> Bool,
    _ message: @autoclosure () -> String = "",
    file: StaticString = #filePath,
    line: UInt = #line
) rethrows {
    if try !expression() {
        fail(message().isEmpty ? "XCTAssertTrue failed" : message(), file: file, line: line)
    }
}

public func XCTAssertFalse(
    _ expression: @autoclosure () throws -> Bool,
    _ message: @autoclosure () -> String = "",
    file: StaticString = #filePath,
    line: UInt = #line
) rethrows {
    if try expression() {
        fail(message().isEmpty ? "XCTAssertFalse failed" : message(), file: file, line: line)
    }
}

public func XCTFail(
    _ message: @autoclosure () -> String = "",
    file: StaticString = #filePath,
    line: UInt = #line
) -> Never {
    fail(message(), file: file, line: line)
}

public func XCTAssertThrowsError<T>(
    _ expression: @autoclosure () throws -> T,
    _ message: @autoclosure () -> String = "",
    file: StaticString = #filePath,
    line: UInt = #line,
    _ errorHandler: (Error) throws -> Void = { _ in }
) rethrows {
    do {
        _ = try expression()
        fail(message().isEmpty ? "XCTAssertThrowsError failed: no error thrown" : message(), file: file, line: line)
    } catch {
        try errorHandler(error)
    }
}

public func XCTAssertGreaterThan<T: Comparable>(
    _ expression1: @autoclosure () throws -> T,
    _ expression2: @autoclosure () throws -> T,
    _ message: @autoclosure () -> String = "",
    file: StaticString = #filePath,
    line: UInt = #line
) rethrows {
    let lhs = try expression1()
    let rhs = try expression2()
    if lhs <= rhs {
        fail(message().isEmpty ? "XCTAssertGreaterThan failed: \(lhs) is not greater than \(rhs)" : message(), file: file, line: line)
    }
}

public func XCTAssertGreaterThanOrEqual<T: Comparable>(
    _ expression1: @autoclosure () throws -> T,
    _ expression2: @autoclosure () throws -> T,
    _ message: @autoclosure () -> String = "",
    file: StaticString = #filePath,
    line: UInt = #line
) rethrows {
    let lhs = try expression1()
    let rhs = try expression2()
    if lhs < rhs {
        fail(message().isEmpty ? "XCTAssertGreaterThanOrEqual failed: \(lhs) is less than \(rhs)" : message(), file: file, line: line)
    }
}

public func XCTAssertLessThan<T: Comparable>(
    _ expression1: @autoclosure () throws -> T,
    _ expression2: @autoclosure () throws -> T,
    _ message: @autoclosure () -> String = "",
    file: StaticString = #filePath,
    line: UInt = #line
) rethrows {
    let lhs = try expression1()
    let rhs = try expression2()
    if lhs >= rhs {
        fail(message().isEmpty ? "XCTAssertLessThan failed: \(lhs) is not less than \(rhs)" : message(), file: file, line: line)
    }
}

public func XCTAssertLessThanOrEqual<T: Comparable>(
    _ expression1: @autoclosure () throws -> T,
    _ expression2: @autoclosure () throws -> T,
    _ message: @autoclosure () -> String = "",
    file: StaticString = #filePath,
    line: UInt = #line
) rethrows {
    let lhs = try expression1()
    let rhs = try expression2()
    if lhs > rhs {
        fail(message().isEmpty ? "XCTAssertLessThanOrEqual failed: \(lhs) is greater than \(rhs)" : message(), file: file, line: line)
    }
}

public func XCTAssertNotEqual<T: Equatable>(
    _ expression1: @autoclosure () throws -> T,
    _ expression2: @autoclosure () throws -> T,
    _ message: @autoclosure () -> String = "",
    file: StaticString = #filePath,
    line: UInt = #line
) rethrows {
    let lhs = try expression1()
    let rhs = try expression2()
    if lhs == rhs {
        fail(message().isEmpty ? "XCTAssertNotEqual failed: both values are \(lhs)" : message(), file: file, line: line)
    }
}

public func XCTUnwrap<T>(
    _ expression: @autoclosure () throws -> T?,
    _ message: @autoclosure () -> String = "",
    file: StaticString = #filePath,
    line: UInt = #line
) throws -> T {
    guard let value = try expression() else {
        throw XCTestShimError.unwrapFailed(message().isEmpty ? "XCTUnwrap failed at \(file):\(line)" : message())
    }
    return value
}

public func XCTSkipUnless(
    _ expression: @autoclosure () throws -> Bool,
    _ message: @autoclosure () -> String = "",
    file: StaticString = #filePath,
    line: UInt = #line
) throws {
    if try !expression() {
        throw XCTestShimError.skipped(message().isEmpty ? "Skipped at \(file):\(line)" : message())
    }
}
