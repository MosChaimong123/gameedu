/* eslint-disable @typescript-eslint/no-require-imports */

const {
  CanvasElement,
  Image,
  ImageData,
  createCanvas,
  loadImage,
} = require("@napi-rs/canvas");

function createRotatedVariant(source, degrees) {
  const canvas = createCanvas(source.width, source.height);
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((degrees * Math.PI) / 180);
  context.scale(0.9, 0.9);
  context.drawImage(
    source,
    -source.width / 2,
    -source.height / 2,
    source.width,
    source.height
  );
  return canvas;
}

function createDimVariant(source) {
  const canvas = createCanvas(source.width, source.height);
  const context = canvas.getContext("2d");
  context.drawImage(source, 0, 0);
  context.fillStyle = "rgba(0, 0, 0, 0.38)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

function createShadowVariant(source) {
  const canvas = createCanvas(source.width, source.height);
  const context = canvas.getContext("2d");
  context.drawImage(source, 0, 0);
  const shadow = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  shadow.addColorStop(0, "rgba(0, 0, 0, 0)");
  shadow.addColorStop(0.55, "rgba(0, 0, 0, 0.08)");
  shadow.addColorStop(1, "rgba(0, 0, 0, 0.5)");
  context.fillStyle = shadow;
  context.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

function createLowResolutionVariant(source) {
  const scale = Math.min(1, 500 / Math.max(source.width, source.height));
  const canvas = createCanvas(
    Math.round(source.width * scale),
    Math.round(source.height * scale)
  );
  canvas
    .getContext("2d")
    .drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function createPerspectiveVariant(cv, source) {
  const input = cv.imread(source);
  const output = new cv.Mat();
  const sourcePoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0,
    0,
    source.width,
    0,
    0,
    source.height,
    source.width,
    source.height,
  ]);
  const destinationPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
    source.width * 0.07,
    source.height * 0.02,
    source.width * 0.96,
    source.height * 0.08,
    source.width * 0.02,
    source.height * 0.96,
    source.width * 0.92,
    source.height * 0.99,
  ]);
  const transform = cv.getPerspectiveTransform(
    sourcePoints,
    destinationPoints
  );
  cv.warpPerspective(
    input,
    output,
    transform,
    new cv.Size(source.width, source.height),
    cv.INTER_LINEAR,
    cv.BORDER_CONSTANT,
    new cv.Scalar(255, 255, 255, 255)
  );
  const canvas = createCanvas(source.width, source.height);
  cv.imshow(canvas, output);
  transform.delete();
  destinationPoints.delete();
  sourcePoints.delete();
  output.delete();
  input.delete();
  return canvas;
}

async function createJpegVariant(source) {
  const jpegDataUrl = source.toDataURL("image/jpeg", 0.42);
  const image = await loadImage(jpegDataUrl);
  const canvas = createCanvas(source.width, source.height);
  canvas.getContext("2d").drawImage(image, 0, 0);
  return canvas;
}

async function main() {
  const imagePath = process.argv[2];
  if (!imagePath) {
    throw new Error("Usage: node scripts/qa-omr-image.cjs <image-path>");
  }

  Object.assign(globalThis, {
    HTMLCanvasElement: CanvasElement,
    HTMLImageElement: Image,
    ImageData,
  });

  console.error("[qa-omr] loading OpenCV");
  const cliArguments = process.argv.splice(2);
  const cvModule = require("@techstark/opencv-js");
  process.argv.push(...cliArguments);
  await new Promise((resolve) => cvModule.then(() => resolve()));
  const cv = cvModule;

  // Initialize TypeScript support only after OpenCV is ready. Registering it
  // earlier makes this legacy Emscripten bundle initialize extremely slowly.
  process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
    module: "CommonJS",
    moduleResolution: "node",
  });
  require("ts-node/register/transpile-only");
  require("tsconfig-paths/register");
  const { processOMR } = require("../src/lib/omr-logic");
  const {
    OMR_ANSWER_GEOMETRY,
    OMR_BUBBLE_RADIUS,
    OMR_CANONICAL_HEIGHT,
    OMR_CANONICAL_WIDTH,
    OMR_OPTION_VALUES,
    OMR_REGISTRATION_MARKERS,
    OMR_STUDENT_ID_GEOMETRY,
  } = require("../src/lib/omr-template");

  if (imagePath === "--synthetic") {
    const scale = 0.65;
    const canvas = createCanvas(
      Math.round(OMR_CANONICAL_WIDTH * scale),
      Math.round(OMR_CANONICAL_HEIGHT * scale)
    );
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.scale(scale, scale);
    context.fillStyle = "#000000";
    for (const marker of OMR_REGISTRATION_MARKERS) {
      context.fillRect(
        marker.x - marker.size / 2,
        marker.y - marker.size / 2,
        marker.size,
        marker.size
      );
    }
    context.strokeStyle = "#aeb5bd";
    context.lineWidth = 2;
    for (const geometry of [
      ...OMR_ANSWER_GEOMETRY,
      ...OMR_STUDENT_ID_GEOMETRY,
    ]) {
      for (const bubble of geometry.bubbles) {
        context.beginPath();
        context.arc(bubble.x, bubble.y, OMR_BUBBLE_RADIUS, 0, Math.PI * 2);
        context.stroke();
      }
    }
    const expectedAnswers = OMR_ANSWER_GEOMETRY.map(
      (geometry) => OMR_OPTION_VALUES[(geometry.question - 1) % 5]
    );
    const fillBubble = (bubble) => {
      context.fillStyle = "#000000";
      context.beginPath();
      context.arc(bubble.x, bubble.y, OMR_BUBBLE_RADIUS - 3, 0, Math.PI * 2);
      context.fill();
    };
    for (const geometry of OMR_ANSWER_GEOMETRY) {
      fillBubble(
        geometry.bubbles.find(
          (bubble) => bubble.value === expectedAnswers[geometry.question - 1]
        )
      );
    }
    const expectedStudentCode = "00001";
    for (const geometry of OMR_STUDENT_ID_GEOMETRY) {
      fillBubble(
        geometry.bubbles.find(
          (bubble) => bubble.value === expectedStudentCode[geometry.position]
        )
      );
    }
    console.error(`[qa-omr] processing synthetic ${canvas.width}x${canvas.height}`);
    const result = await processOMR(cv, canvas);
    const answersMatch =
      result.success &&
      result.data.every(
        (answer, index) => answer.answer === expectedAnswers[index]
      );
    const success =
      result.success &&
      answersMatch &&
      result.studentCode === expectedStudentCode &&
      result.ambiguousQuestions.length === 0;
    console.log(
      JSON.stringify(
        {
          success,
          expectedStudentCode,
          detectedStudentCode: result.success ? result.studentCode : null,
          answersMatched: answersMatch,
          ambiguousQuestions: result.success ? result.ambiguousQuestions : [],
        },
        null,
        2
      )
    );
    process.exit(success ? 0 : 1);
  }

  console.error("[qa-omr] loading image");
  const image = await loadImage(imagePath);
  const scale = Math.min(1, 900 / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  const canvas = createCanvas(width, height);
  canvas.getContext("2d").drawImage(image, 0, 0, width, height);

  if (process.argv.includes("--diagnostic")) {
    const source = cv.imread(canvas);
    const gray = new cv.Mat();
    const threshold = new cv.Mat();
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.adaptiveThreshold(
      gray,
      threshold,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY_INV,
      31,
      10
    );
    cv.findContours(
      threshold,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE
    );
    const centers = [];
    for (let index = 0; index < contours.size(); index += 1) {
      const contour = contours.get(index);
      const rect = cv.boundingRect(contour);
      contour.delete();
      const aspect = rect.width / Math.max(1, rect.height);
      if (
        rect.width >= 14 &&
        rect.width <= 24 &&
        rect.height >= 14 &&
        rect.height <= 24 &&
        aspect >= 0.78 &&
        aspect <= 1.22
      ) {
        centers.push({
          x: Math.round(rect.x + rect.width / 2),
          y: Math.round(rect.y + rect.height / 2),
          width: rect.width,
          height: rect.height,
        });
      }
    }
    console.error(`[qa-omr] circle candidates: ${centers.length}`);
    console.error(JSON.stringify(centers, null, 2));
    hierarchy.delete();
    contours.delete();
    threshold.delete();
    gray.delete();
    source.delete();
  }

  console.error(`[qa-omr] processing ${width}x${height}`);
  const result = await processOMR(cv, canvas);
  console.error("[qa-omr] processing complete");
  if (process.argv.includes("--matrix")) {
    if (!result.success || result.studentCode === null) {
      throw new Error(
        "The baseline image must have readable answers and a student code before matrix QA"
      );
    }
    const expectedAnswers = result.data.map((answer) => answer.answer);
    const expectedStudentCode = result.studentCode;
    const variants = [
      ["rotate-left-5deg", createRotatedVariant(canvas, -5)],
      ["rotate-right-5deg", createRotatedVariant(canvas, 5)],
      ["perspective", createPerspectiveVariant(cv, canvas)],
      ["dim-38-percent", createDimVariant(canvas)],
      ["diagonal-shadow", createShadowVariant(canvas)],
      ["low-resolution", createLowResolutionVariant(canvas)],
      ["jpeg-quality-42", await createJpegVariant(canvas)],
    ];
    const matrix = [];
    for (const [name, variant] of variants) {
      const variantResult = await processOMR(cv, variant);
      const answersMatched =
        variantResult.success &&
        variantResult.data.every(
          (answer, index) => answer.answer === expectedAnswers[index]
        );
      const passed =
        variantResult.success &&
        answersMatched &&
        variantResult.studentCode === expectedStudentCode &&
        variantResult.ambiguousQuestions.length === 0;
      matrix.push({
        name,
        passed,
        answersMatched,
        detectedStudentCode: variantResult.success
          ? variantResult.studentCode
          : null,
        ambiguousQuestions: variantResult.success
          ? variantResult.ambiguousQuestions
          : [],
        error: variantResult.success ? null : variantResult.messageKey,
      });
    }
    const passed = matrix.every((entry) => entry.passed);
    console.log(
      JSON.stringify(
        {
          success: passed,
          baseline: {
            answerCount: expectedAnswers.length,
            studentCode: expectedStudentCode,
          },
          matrix,
        },
        null,
        2
      )
    );
    process.exit(passed ? 0 : 1);
  }
  const summary = result.success
    ? {
        success: true,
        answerCount: result.data.length,
        markedCount: result.data.filter((answer) => answer.answer !== null).length,
        ambiguousQuestions: result.ambiguousQuestions,
        studentCode: result.studentCode,
        studentCodeConfidence: result.studentCodeConfidence,
      }
    : result;
  console.log(
    JSON.stringify(
      {
        image: {
          path: imagePath,
          sourceWidth: image.width,
          sourceHeight: image.height,
          processedWidth: width,
          processedHeight: height,
        },
        result: process.argv.includes("--full") ? result : summary,
      },
      null,
      2
    )
  );
  process.exit(result.success ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
