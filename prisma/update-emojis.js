const fs = require('fs');

const file = 'prisma/seed-items.ts';
let content = fs.readFileSync(file, 'utf8');

const replacements = {
  'Wooden Sword': '🪵',
  'Iron Blade': '🗡️',
  'Steel Longsword': '⚔️',
  'Silver Rapier': '🤺',
  'Enchanted Axe': '🪓',
  'Mithril Spear': '🔱',
  'Dragon Fang Sword': '🩸',
  'Thunder Blade': '🌩️',
  'Void Reaper': '⛏️',
  'Celestial Blade': '🌠',
  'Excalibur': '⚜️',
  'Abyssal Greatsword': '🦇',

  'Cloth Robe': '🥻',
  'Leather Vest': '🦺',
  'Chainmail': '⛓️',
  "Knight's Plate": '🛡️',
  "Mage's Vestment": '👘',
  'Dragon Scale Armor': '🦎',
  'Shadow Shroud': '🧥',
  'Void Carapace': '🪲',
  'Celestial Plate': '👼',
  'Abyssal Robe': '🕴️',

  'Leather Cap': '🧢',
  'Iron Helm': '🪖',
  'Wizard Hat': '🎩',
  'Battle Helm': '🪨',
  'Dragon Crown': '👑',
  'Shadow Hood': '🥷',
  'Celestial Tiara': '🧝‍♀️',
  'Void Mask': '👽',

  'Wooden Shield': '🚪',
  'Iron Buckler': '🛡️',
  'Spell Tome': '📘',
  'Mana Crystal': '💎',
  'Shadow Orb': '🔮',
  'Arcane Focus': '🧿',
  'Celestial Grimoire': '📒',
  'Void Scepter': '🦯',

  'Cloth Gloves': '🧤',
  'Leather Gauntlets': '🥊',
  'Swift Gloves': '🪶',
  'Berserker Fists': '👊',
  'Dragon Claws': '🐾',
  'Thunder Gauntlets': '⚡', 
  'Celestial Gauntlets': '👐',
  'Void Grips': '🦾',

  'Sandals': '🩴',
  'Leather Boots': '🥾',
  'Swift Boots': '🪽',
  'Lucky Treads': '🩰',
  'Thunder Treads': '⛸️',
  'Shadow Walkers': '👞',
  'Celestial Boots': '🛼',
  'Void Striders': '🪐',

  'Lucky Charm': '🐞',
  'Gold Ring': '🪙',
  "Scholar's Pendant": '📜',
  'Thunder Amulet': '🔌',
  'Shadow Talisman': '🕸️',
  'Celestial Orb': '✨',
  'Tears of Goddess': '💧',
  'Ring of Sovereign': '💍',
};

let lines = content.split('\n');
let currentName = null;

for (let i = 0; i < lines.length; i++) {
  const nameMatch = lines[i].match(/name:\s*'([^']+)'/);
  if (nameMatch) {
    currentName = nameMatch[1];
  }
  
  if (currentName && lines[i].includes('image:')) {
    const newEmoji = replacements[currentName];
    if (newEmoji) {
      lines[i] = lines[i].replace(/image:\s*'[^']+'+/, "image: '" + newEmoji + "'");
    } else {
      console.log('No replacement found for', currentName);
    }
    currentName = null; 
  }
}

fs.writeFileSync(file, lines.join('\n'));
console.log('Updated emojis!');
