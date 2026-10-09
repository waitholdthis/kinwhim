import AVFoundation
import ExpoModulesCore
import UIKit

private let fps: Int32 = 30

// Renders a Kinwhim memory into a short "mini movie": a slow zoom and drift,
// falling confetti, and the wordmark — the same animation as the web app.
public class KinwhimMovieModule: Module {
  public func definition() -> ModuleDefinition {
    Name("KinwhimMovie")

    Events("onProgress")

    AsyncFunction("renderMovie") { (imageUri: String, outputUri: String, size: Int, durationMs: Int, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          try self.render(
            imagePath: Self.path(imageUri),
            outputPath: Self.path(outputUri),
            requestedSize: size,
            durationMs: durationMs
          )
          promise.resolve(outputUri)
        } catch let error as Exception {
          promise.reject(error)
        } catch {
          promise.reject(MovieException(error.localizedDescription))
        }
      }
    }
  }

  private static func path(_ uri: String) -> String {
    URL(string: uri)?.isFileURL == true ? URL(string: uri)!.path : uri
  }

  private func render(imagePath: String, outputPath: String, requestedSize: Int, durationMs: Int) throws {
    // H.264 wants even dimensions; multiples of 16 encode most efficiently.
    let size = (min(max(requestedSize, 256), 1080) / 16) * 16
    guard let image = UIImage(contentsOfFile: imagePath) else {
      throw MovieException("Couldn’t open the memory image.")
    }
    let outputURL = URL(fileURLWithPath: outputPath)
    try? FileManager.default.removeItem(at: outputURL)
    try FileManager.default.createDirectory(at: outputURL.deletingLastPathComponent(), withIntermediateDirectories: true)

    let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)
    let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
      AVVideoCodecKey: AVVideoCodecType.h264,
      AVVideoWidthKey: size,
      AVVideoHeightKey: size,
      AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: 5_000_000,
        AVVideoMaxKeyFrameIntervalKey: Int(fps),
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
      ],
    ])
    input.expectsMediaDataInRealTime = false
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
      kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
      kCVPixelBufferWidthKey as String: size,
      kCVPixelBufferHeightKey as String: size,
      kCVPixelBufferCGImageCompatibilityKey as String: true,
      kCVPixelBufferCGBitmapContextCompatibilityKey as String: true,
    ])
    guard writer.canAdd(input) else { throw MovieException("The video encoder isn’t available.") }
    writer.add(input)
    guard writer.startWriting() else {
      throw MovieException(writer.error?.localizedDescription ?? "Couldn’t start the movie.")
    }
    writer.startSession(atSourceTime: .zero)

    let painter = FramePainter(image: image, size: CGFloat(size))
    let totalFrames = max(durationMs * Int(fps) / 1000, 1)
    for index in 0..<totalFrames {
      while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.002) }
      guard let pool = adaptor.pixelBufferPool else { throw MovieException("The video encoder isn’t ready.") }
      var buffer: CVPixelBuffer?
      CVPixelBufferPoolCreatePixelBuffer(nil, pool, &buffer)
      guard let pixelBuffer = buffer else { throw MovieException("Ran out of memory while making the movie.") }

      CVPixelBufferLockBaseAddress(pixelBuffer, [])
      if let context = CGContext(
        data: CVPixelBufferGetBaseAddress(pixelBuffer),
        width: size,
        height: size,
        bitsPerComponent: 8,
        bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer),
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
      ) {
        // Flip to UIKit's top-left origin so drawing matches the web canvas.
        context.translateBy(x: 0, y: CGFloat(size))
        context.scaleBy(x: 1, y: -1)
        UIGraphicsPushContext(context)
        painter.draw(context, progress: CGFloat(index) / CGFloat(max(totalFrames - 1, 1)))
        UIGraphicsPopContext()
      }
      CVPixelBufferUnlockBaseAddress(pixelBuffer, [])

      if !adaptor.append(pixelBuffer, withPresentationTime: CMTime(value: CMTimeValue(index), timescale: fps)) {
        throw MovieException(writer.error?.localizedDescription ?? "Couldn’t write a movie frame.")
      }
      if index % 6 == 0 { sendEvent("onProgress", ["progress": Double(index) / Double(totalFrames)]) }
    }

    input.markAsFinished()
    let finished = DispatchSemaphore(value: 0)
    writer.finishWriting { finished.signal() }
    finished.wait()
    if writer.status != .completed {
      throw MovieException(writer.error?.localizedDescription ?? "Couldn’t finish the movie.")
    }
    sendEvent("onProgress", ["progress": 1.0])
  }
}

final class MovieException: Exception {
  private let message: String

  init(_ message: String) {
    self.message = message
    super.init()
  }

  override var code: String { "ERR_MINI_MOVIE" }
  override var reason: String { message }
}

// Draws one frame. Geometry is defined on the web app's 720px canvas and scaled.
private struct FramePainter {
  let image: UIImage
  let size: CGFloat
  private var k: CGFloat { size / 720 }
  private let confetti = [
    UIColor(red: 0.937, green: 0.514, blue: 0.329, alpha: 1),
    UIColor(red: 0.961, green: 0.851, blue: 0.545, alpha: 1),
    UIColor(red: 0.788, green: 0.851, blue: 0.765, alpha: 1),
    UIColor(red: 1.0, green: 0.973, blue: 0.910, alpha: 1),
  ]

  init(image: UIImage, size: CGFloat) {
    self.image = image
    self.size = size
  }

  func draw(_ context: CGContext, progress: CGFloat) {
    UIColor(red: 0.141, green: 0.129, blue: 0.090, alpha: 1).setFill()
    context.fill(CGRect(x: 0, y: 0, width: size, height: size))

    let scale = 1.03 + progress * 0.09
    let drawn = size * scale
    let left = (size - drawn) / 2 + sin(progress * .pi) * 14 * k
    let top = (size - drawn) / 2 - progress * 12 * k
    image.draw(in: CGRect(x: left, y: top, width: drawn, height: drawn))

    UIColor(red: 20 / 255, green: 15 / 255, blue: 8 / 255, alpha: 0.16).setFill()
    context.fill(CGRect(x: 0, y: 0, width: size, height: size))

    for i in 0..<22 {
      let x = (CGFloat(i * 97) + progress * 310 * CGFloat(i % 3 + 1)).truncatingRemainder(dividingBy: 780) - 30
      let y = (CGFloat(i * 61) + progress * 920).truncatingRemainder(dividingBy: 780) - 30
      context.saveGState()
      context.translateBy(x: x * k, y: y * k)
      context.rotate(by: progress * 8 + CGFloat(i))
      confetti[i % confetti.count].setFill()
      context.fill(CGRect(x: -4 * k, y: -9 * k, width: 8 * k, height: 18 * k))
      context.restoreGState()
    }

    let font = UIFont(name: "Georgia-Bold", size: 28 * k) ?? .boldSystemFont(ofSize: 28 * k)
    let wordmark = NSAttributedString(string: "kinwhim", attributes: [
      .font: font,
      .foregroundColor: UIColor(red: 1, green: 0.973, blue: 0.910, alpha: 0.92),
    ])
    // The web draws text from its baseline at y = 680.
    wordmark.draw(at: CGPoint(x: 28 * k, y: 680 * k - font.ascender))
  }
}
