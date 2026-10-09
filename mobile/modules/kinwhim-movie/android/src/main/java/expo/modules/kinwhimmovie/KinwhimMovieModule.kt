package expo.modules.kinwhimmovie

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaFormat
import android.media.MediaMuxer
import android.net.Uri
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import kotlin.math.PI
import kotlin.math.sin
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

private const val FPS = 30
private const val MIME = MediaFormat.MIMETYPE_VIDEO_AVC

class MovieException(message: String) : CodedException("ERR_MINI_MOVIE", message, null)

// Renders a Kinwhim memory into a short "mini movie": a slow zoom and drift,
// falling confetti, and the wordmark — the same animation as the web app.
class KinwhimMovieModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("KinwhimMovie")

    Events("onProgress")

    AsyncFunction("renderMovie") Coroutine { imageUri: String, outputUri: String, size: Int, durationMs: Int ->
      withContext(Dispatchers.Default) {
        render(pathOf(imageUri), pathOf(outputUri), size, durationMs)
      }
      return@Coroutine outputUri
    }
  }

  private fun pathOf(uri: String): String = Uri.parse(uri).path ?: uri

  private fun render(imagePath: String, outputPath: String, requestedSize: Int, durationMs: Int) {
    // H.264 encoders want even dimensions, usually multiples of 16.
    val size = (requestedSize.coerceIn(256, 1080) / 16) * 16
    val source = BitmapFactory.decodeFile(imagePath) ?: throw MovieException("Couldn’t open the memory image.")
    val frame = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(frame)
    val painter = FramePainter(source, size)
    val pixels = IntArray(size * size)
    val totalFrames = (durationMs * FPS / 1000).coerceAtLeast(1)

    File(outputPath).apply { parentFile?.mkdirs(); delete() }
    val format = MediaFormat.createVideoFormat(MIME, size, size).apply {
      setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Flexible)
      setInteger(MediaFormat.KEY_BIT_RATE, 5_000_000)
      setInteger(MediaFormat.KEY_FRAME_RATE, FPS)
      setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 1)
    }
    val codec = MediaCodec.createEncoderByType(MIME)
    val muxer = MediaMuxer(outputPath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
    var track = -1
    var muxing = false
    val info = MediaCodec.BufferInfo()

    try {
      codec.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
      codec.start()
      var frameIndex = 0
      var inputDone = false
      var outputDone = false

      while (!outputDone) {
        if (!inputDone) {
          val inputIndex = codec.dequeueInputBuffer(10_000)
          if (inputIndex >= 0) {
            val presentationUs = frameIndex * 1_000_000L / FPS
            if (frameIndex >= totalFrames) {
              codec.queueInputBuffer(inputIndex, 0, 0, presentationUs, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
              inputDone = true
            } else {
              painter.draw(canvas, frameIndex.toFloat() / (totalFrames - 1).coerceAtLeast(1))
              frame.getPixels(pixels, 0, size, 0, 0, size, size)
              val image = codec.getInputImage(inputIndex) ?: throw MovieException("The video encoder isn’t available.")
              writeYuv(pixels, size, image)
              codec.queueInputBuffer(inputIndex, 0, size * size * 3 / 2, presentationUs, 0)
              frameIndex++
              if (frameIndex % 6 == 0) {
                sendEvent("onProgress", mapOf("progress" to frameIndex.toDouble() / totalFrames))
              }
            }
          }
        }

        val outputIndex = codec.dequeueOutputBuffer(info, 10_000)
        when {
          outputIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
            track = muxer.addTrack(codec.outputFormat)
            muxer.start()
            muxing = true
          }
          outputIndex >= 0 -> {
            val buffer = codec.getOutputBuffer(outputIndex)!!
            val isConfig = info.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG != 0
            if (info.size > 0 && !isConfig && muxing) {
              buffer.position(info.offset)
              buffer.limit(info.offset + info.size)
              muxer.writeSampleData(track, buffer, info)
            }
            codec.releaseOutputBuffer(outputIndex, false)
            if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) outputDone = true
          }
        }
      }
      sendEvent("onProgress", mapOf("progress" to 1.0))
    } finally {
      runCatching { codec.stop() }
      codec.release()
      if (muxing) runCatching { muxer.stop() }
      muxer.release()
      source.recycle()
      frame.recycle()
    }
  }

  // Converts ARGB pixels into whatever YUV 4:2:0 layout the encoder asked for
  // (planar or semi-planar), honoring each plane's row and pixel stride.
  private fun writeYuv(argb: IntArray, size: Int, image: android.media.Image) {
    val (yPlane, uPlane, vPlane) = image.planes
    val yBuffer = yPlane.buffer
    val uBuffer = uPlane.buffer
    val vBuffer = vPlane.buffer
    for (row in 0 until size) {
      val yRow = row * yPlane.rowStride
      for (col in 0 until size) {
        val color = argb[row * size + col]
        val r = (color shr 16) and 0xff
        val g = (color shr 8) and 0xff
        val b = color and 0xff
        yBuffer.put(yRow + col * yPlane.pixelStride, (((66 * r + 129 * g + 25 * b + 128) shr 8) + 16).toByte())
        if (row % 2 == 0 && col % 2 == 0) {
          val u = ((-38 * r - 74 * g + 112 * b + 128) shr 8) + 128
          val v = ((112 * r - 94 * g - 18 * b + 128) shr 8) + 128
          uBuffer.put((row / 2) * uPlane.rowStride + (col / 2) * uPlane.pixelStride, u.toByte())
          vBuffer.put((row / 2) * vPlane.rowStride + (col / 2) * vPlane.pixelStride, v.toByte())
        }
      }
    }
  }
}

// Draws one frame. Geometry is defined on the web app's 720px canvas and scaled.
private class FramePainter(private val image: Bitmap, private val size: Int) {
  private val k = size / 720f
  private val confettiColors = intArrayOf(
    Color.parseColor("#EF8354"),
    Color.parseColor("#F5D98B"),
    Color.parseColor("#C9D9C3"),
    Color.parseColor("#FFF8E8"),
  )
  private val imagePaint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)
  private val fill = Paint(Paint.ANTI_ALIAS_FLAG)
  private val wordmark = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.argb(235, 255, 248, 232)
    textSize = 28f * k
    typeface = Typeface.create(Typeface.SERIF, Typeface.BOLD)
  }
  private val target = RectF()

  fun draw(canvas: Canvas, progress: Float) {
    canvas.drawColor(Color.parseColor("#242117"))

    val scale = 1.03f + progress * 0.09f
    val drawn = size * scale
    val left = (size - drawn) / 2 + sin(progress * PI).toFloat() * 14f * k
    val top = (size - drawn) / 2 - progress * 12f * k
    target.set(left, top, left + drawn, top + drawn)
    canvas.drawBitmap(image, null, target, imagePaint)

    fill.color = Color.argb(41, 20, 15, 8)
    canvas.drawRect(0f, 0f, size.toFloat(), size.toFloat(), fill)

    for (i in 0 until 22) {
      val x = ((i * 97 + progress * 310 * (i % 3 + 1)) % 780 - 30) * k
      val y = ((i * 61 + progress * 920) % 780 - 30) * k
      canvas.save()
      canvas.translate(x, y)
      canvas.rotate(Math.toDegrees((progress * 8 + i).toDouble()).toFloat())
      fill.color = confettiColors[i % confettiColors.size]
      canvas.drawRect(-4f * k, -9f * k, 4f * k, 9f * k, fill)
      canvas.restore()
    }

    canvas.drawText("kinwhim", 28f * k, 680f * k, wordmark)
  }
}
