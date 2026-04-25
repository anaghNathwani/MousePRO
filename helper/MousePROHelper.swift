/// MousePROHelper — native macOS cursor applicator
/// Compile on macOS: see helper/build.sh
///
/// Usage: MousePROHelper <image.png> <hotspotX> <hotspotY> [--check]

import Foundation
import AppKit
import CoreGraphics

// ─── Private CoreGraphics / CGS API declarations ──────────────────────────────
// These are the same private APIs used by Mousecape and Apple's own tools.

private typealias CGSConnectionID = Int32

@_silgen_name("CGSMainConnectionID")
private func CGSMainConnectionID() -> CGSConnectionID

@_silgen_name("CGSSetConnectionProperty")
private func CGSSetConnectionProperty(
    _ connection: CGSConnectionID,
    _ targetConnection: CGSConnectionID,
    _ key: CFString,
    _ value: CFTypeRef
) -> Int32

@_silgen_name("CGSGetConnectionProperty")
private func CGSGetConnectionProperty(
    _ connection: CGSConnectionID,
    _ targetConnection: CGSConnectionID,
    _ key: CFString,
    _ value: UnsafeMutablePointer<CFTypeRef?>
) -> Int32

// ─── Accessibility check ──────────────────────────────────────────────────────

func hasAccessibilityPermission() -> Bool {
    let options: NSDictionary = [kAXTrustedCheckOptionPrompt.takeUnretainedValue(): false]
    return AXIsProcessTrustedWithOptions(options)
}

func requestAccessibilityPermission() -> Bool {
    let options: NSDictionary = [kAXTrustedCheckOptionPrompt.takeUnretainedValue(): true]
    return AXIsProcessTrustedWithOptions(options)
}

// ─── Cursor application ───────────────────────────────────────────────────────

struct CursorApplyError: Error, CustomStringConvertible {
    let description: String
}

func makeCGImage(from path: String, size: Int) throws -> CGImage {
    guard let nsImage = NSImage(contentsOfFile: path) else {
        throw CursorApplyError(description: "Cannot load image at \(path)")
    }

    let targetSize = CGSize(width: size, height: size)
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let bitmapInfo = CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue)

    guard let ctx = CGContext(
        data: nil,
        width: size,
        height: size,
        bitsPerComponent: 8,
        bytesPerRow: size * 4,
        space: colorSpace,
        bitmapInfo: bitmapInfo.rawValue
    ) else {
        throw CursorApplyError(description: "Cannot create CGContext")
    }

    ctx.clear(CGRect(origin: .zero, size: targetSize))

    // Draw via NSGraphicsContext so NSImage renders correctly (SVG, PDF, etc.)
    let gctx = NSGraphicsContext(cgContext: ctx, flipped: false)
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = gctx
    nsImage.draw(
        in: NSRect(origin: .zero, size: targetSize),
        from: NSRect(origin: .zero, size: nsImage.size),
        operation: .sourceOver,
        fraction: 1.0
    )
    NSGraphicsContext.restoreGraphicsState()

    guard let cgImage = ctx.makeImage() else {
        throw CursorApplyError(description: "Cannot create CGImage from context")
    }
    return cgImage
}

func applySystemCursor(imagePath: String, hotspotX: CGFloat, hotspotY: CGFloat, size: Int) throws {
    let cgImage = try makeCGImage(from: imagePath, size: size)

    // Build NSCursor — AppKit will construct the internal CGSCursor representation
    let nsImage = NSImage(cgImage: cgImage, size: NSSize(width: size, height: size))
    let hotspot = NSPoint(x: hotspotX, y: hotspotY)
    let cursor = NSCursor(image: nsImage, hotSpot: hotspot)

    let connection = CGSMainConnectionID()

    // Build the cursor property dictionary CGS expects.
    // Key "CGSCursorSeed" triggers system-wide cursor update.
    // Value: dict with CGImage and hotspot data.
    let hotspotDict: NSDictionary = ["x": hotspotX, "y": hotspotY]
    let cursorProperties: NSDictionary = [
        "CursorImage": cgImage,
        "CursorHotSpot": hotspotDict,
        "CursorSize": ["width": size, "height": size],
    ]

    let cgResult = CGSSetConnectionProperty(
        connection,
        connection,
        "CGSCursorSeed" as CFString,
        cursorProperties
    )

    if cgResult == 0 {
        // Success — also set for the current process so it takes effect immediately
        cursor.set()
        fputs("ok:native\n", stdout)
        return
    }

    // Fallback: set for current process only (Electron window)
    // This still gives full coverage when the app itself is frontmost.
    cursor.set()
    fputs("ok:process\n", stdout)
}

// ─── Entry point ──────────────────────────────────────────────────────────────

func main() {
    let args = CommandLine.arguments

    // Health-check mode: just report permission status
    if args.contains("--check") {
        let trusted = hasAccessibilityPermission()
        print(trusted ? "trusted" : "untrusted")
        exit(0)
    }

    // Request accessibility permission (shows system dialog if needed)
    if args.contains("--request-permission") {
        let granted = requestAccessibilityPermission()
        print(granted ? "granted" : "denied")
        exit(0)
    }

    guard args.count >= 4 else {
        fputs("Usage: MousePROHelper <image.png> <hotspotX> <hotspotY> [size]\n", stderr)
        exit(2)
    }

    let imagePath = args[1]
    guard let hx = Double(args[2]), let hy = Double(args[3]) else {
        fputs("Invalid hotspot values\n", stderr)
        exit(2)
    }
    let size = args.count >= 5 ? (Int(args[4]) ?? 32) : 32

    // Ensure we have AX permission before trying
    if !hasAccessibilityPermission() {
        fputs("error:accessibility — grant Accessibility permission in System Settings → Privacy & Security\n", stderr)
        exit(3)
    }

    do {
        try applySystemCursor(imagePath: imagePath, hotspotX: CGFloat(hx), hotspotY: CGFloat(hy), size: size)
        exit(0)
    } catch {
        fputs("error:\(error)\n", stderr)
        exit(1)
    }
}

main()
