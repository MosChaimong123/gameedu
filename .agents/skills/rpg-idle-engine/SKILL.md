---
name: RPG Idle Engine
description: A specialized skill for designing and implementing RPG Idle/Clicker game systems within GameEdu, including asset generation and incremental logic.
---

# RPG Idle Engine

This skill enables the agent to design, implement, and expand RPG Idle systems. It focuses on balancing education with gamification, managing incremental growth, and generating high-quality visual assets.

## Core Capabilities

1.  **System Architecture**: Designing timestamp-based idle systems to minimize server load.
2.  **Asset Generation**: Crafting precise prompts for characters, monsters, items, and UI elements in a "cute/vibrant RPG" style.
3.  **Progression Balancing**: Calculating math for rank-based multipliers and unlockable features.

---

## Instruction Guidelines

### 1. Incremental Logic (Idle Mechanics)
When building idle mechanics, ALWAYS use **Timestamp-based Calculation**:
- **Storage**: Store `lastSyncTime` (ISO String) and `earnedTotal` in the database.
- **Calculation**: 
  `CurrentBalance = earnedTotal + ((CurrentTime - lastSyncTime) * RatePerSecond)`
- **Throttling**: Only sync to the database during major events (purchase, level up) or at a specific interval (e.g., every 60s).

### 2. Image Generation Prompts (RPG Style)
Use the following prompt templates for `generate_image`:

#### Character/Rank Cards
> "Cute RPG character card illustration, [RANK NAME] themed, vibrant cartoon style, high-quality digital art, 2D game asset, white background, detailed armor and accessories, magical aura, professional UI frame."

#### Monsters/Bosses
> "Adorable but fierce RPG monster, [ELEMENT/THEME], vector style game art, clean lines, vibrant colors, isolated on white background, 2D game sprite."

#### Items/Icons
> "Stunning RPG item icon, [ITEM NAME], glow effect, 3D rendered style but 2D game asset, high detail, vibrant gold and magical elements, isolated background."

### 3. Database Schema (MongoDB/Prisma)
For the current MongoDB stack, use JSON fields to store flexible stats:
```prisma
model Student {
  // ... existing fields
  gameStats Json? // { gold: number, level: number, equipment: string[], inventory: any[] }
}
```

---

## Example Workflow: Creating a "Monster Hunt" Event
1.  **Define Monster**: Generate an image using the Monster prompt.
2.  **Create Logic**: Implement a global health pool (Shared Boss) stored in the Classroom model.
3.  **Reward**: Logic that grants "Education Points" (Academic Points) based on damage dealt (Assignments Completed).

---

## Best Practices
- **Prioritize Learning**: Game mechanics must always feel like a reward for academic progress (Sending assignments = Damage/Gold).
- **Optimize Assets**: Use `.webp` or `.png` for icons to keep page load times low.
## Communication Standard
- **สรุปงานเป็นภาษาไทยทุกครั้ง**: หลังจากเสร็จสิ้นภารกิจหรือการแก้ไขโค้ด ให้สรุปสิ่งที่ทำลงในแชทเป็นภาษาไทยเพื่อให้ผู้ใช้เข้าใจง่าย
