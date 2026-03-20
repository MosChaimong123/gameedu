/**
 * OMR Logic Utility using OpenCV.js
 * I am Antigravity.
 */

/**
 * OMR Logic Utility using OpenCV.js
 * I am Antigravity.
 */

export const processOMR = async (cv: any, imageSource: HTMLImageElement | HTMLCanvasElement) => {
    let src = cv.imread(imageSource)
    let gray = new cv.Mat()
    let thresh = new cv.Mat()

    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0)
    cv.adaptiveThreshold(gray, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2)

    let contours = new cv.MatVector()
    let hierarchy = new cv.Mat()
    cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    let anchors = []
    for (let i = 0; i < contours.size(); ++i) {
        let cnt = contours.get(i)
        let rect = cv.boundingRect(cnt)
        let aspectRatio = rect.width / rect.height
        
        if (aspectRatio > 0.7 && aspectRatio < 1.3 && rect.width > 15 && rect.width < 120) {
            anchors.push({
                x: rect.x + rect.width / 2,
                y: rect.y + rect.height / 2,
                area: rect.width * rect.height
            })
        }
    }

    if (anchors.length < 4) {
        // Cleanup and return failure
        src.delete(); gray.delete(); thresh.delete(); contours.delete(); hierarchy.delete();
        return { success: false, message: `ตรวจไม่พบเครื่องหมาย (พบเพียง ${anchors.length}/4 จุด)` }
    }

    // Sort anchors by distance to corners to identify TL, TR, BL, BR
    // Logic: TL has smallest sum(x,y), BR has largest sum(x,y), etc.
    anchors.sort((a, b) => (a.x + a.y) - (b.x + b.y))
    const tl = anchors[0]
    const br = anchors[anchors.length - 1]
    
    // Remaining two are TR and BL
    const others = anchors.slice(1, -1).sort((a, b) => a.x - b.x)
    const bl = others[0]
    const tr = others[1]

    // Perspective Transformation
    let srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, bl.x, bl.y, br.x, br.y])
    let outSize = 600 // We want a 600x600 square result
    let dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, outSize, 0, 0, outSize, outSize, outSize])
    
    let M = cv.getPerspectiveTransform(srcCoords, dstCoords)
    let warped = new cv.Mat()
    cv.warpPerspective(gray, warped, M, new cv.Size(outSize, outSize))

    // Bubble Detection (20 Questions mock grid)
    const questions = 20
    const detectedAnswers = []
    
    // Approximate grid parameters (adjusted to the OMRSheet.tsx design)
    // In actual production, these would be calculated based on the template proportions
    for (let q = 0; q < questions; q++) {
        const rowY = 100 + (q * 23) // Skip header, each row roughly 23px
        let bestOption = -1
        let maxDarkness = -1

        for (let opt = 0; opt < 4; opt++) {
            const colX = 130 + (opt * 45) // First bubble starts at 130, spacing 45
            
            // Sample a 10x10 area around the bubble center
            let rect = new cv.Rect(colX - 5, rowY - 5, 10, 10)
            let roi = warped.roi(rect)
            
            // Count average intensity (0=black, 255=white)
            let mean = cv.mean(roi)[0]
            let darkness = 255 - mean // Reverse to 255=black

            if (darkness > maxDarkness) {
                maxDarkness = darkness
                bestOption = opt
            }
            roi.delete()
        }
        
        // Threshold for a "filled" bubble (tuning required)
        if (maxDarkness > 80) {
            detectedAnswers.push({ question: q + 1, answer: String.fromCharCode(65 + bestOption) })
        } else {
            detectedAnswers.push({ question: q + 1, answer: null })
        }
    }

    // Cleanup
    src.delete(); gray.delete(); thresh.delete(); contours.delete(); hierarchy.delete();
    srcCoords.delete(); dstCoords.delete(); M.delete(); warped.delete();

    return { 
        success: true, 
        message: "สกัดข้อมูลคำตอบสำเร็จ",
        data: detectedAnswers
    }
}
