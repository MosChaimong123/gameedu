/**
 * ค่า `MonsterForm.icon` ใช้ได้ทั้ง emoji และ path รูป
 * — path จากโฟลเดอร์ public เช่น `/assets/negamon/naga_rank1.png`
 * — หรือ URL เต็ม https://...
 */
export function isNegamonIconImageUrl(icon: string): boolean {
    const s = icon.trim();
    return (
        /^https?:\/\//i.test(s) ||
        s.startsWith("/") ||
        /\.(png|jpe?g|webp|gif|svg)(\?|#|$)/i.test(s)
    );
}
