export {
    getR2PublicBaseUrl,
    getR2PublicHost,
    getUploadStorageMode,
    isR2Configured,
    type UploadStorageMode,
} from "@/lib/storage/r2-env";
export { uploadBoardAssetToR2 } from "@/lib/storage/upload-board-asset";
export {
    deleteBoardAssetFromR2,
    deleteBoardAssetsFromR2,
    extractR2ObjectKeyFromUrl,
} from "@/lib/storage/delete-board-asset";
export { collectBoardPostMediaUrls } from "@/lib/storage/collect-board-media-urls";
