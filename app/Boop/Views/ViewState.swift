import SwiftUI

// The macOS 27 SDK also exports a State macro, whose SwiftUIMacros plugin
// is absent from Command Line Tools. A distinct name selects the existing
// property wrapper on every SDK, preserving storage and projected bindings.
typealias ViewState<Value> = SwiftUI.State<Value>
