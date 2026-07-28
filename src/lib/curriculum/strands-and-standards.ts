import { z } from "zod"
import { curriculumSourceRefSchema, type CurriculumSourceRef } from "@/lib/curriculum/source-registry"
import {
    canonicalSubjectIdSchema,
    getCanonicalSubjectById,
    type CanonicalSubjectId,
} from "@/lib/curriculum/subject-catalog"

export const CURRICULUM_STRAND_STANDARD_SCHEMA_VERSION = "curriculum_strand_standard_v1" as const

export const curriculumStandardCodeSchema = z.string().trim().regex(/^[ก-ฮA-Z]+ ?\d+\.\d+$/u)

export const curriculumStrandSchema = z.object({
    id: z.string().trim().min(1),
    subjectId: canonicalSubjectIdSchema,
    code: z.string().trim().min(1),
    labelTh: z.string().trim().min(1),
    labelEn: z.string().trim().min(1),
    order: z.number().int().min(0),
    sourceRefs: z.array(curriculumSourceRefSchema).min(1),
})

export const curriculumStandardSchema = z.object({
    id: z.string().trim().min(1),
    subjectId: canonicalSubjectIdSchema,
    strandId: z.string().trim().min(1),
    code: curriculumStandardCodeSchema,
    labelTh: z.string().trim().min(1),
    labelEn: z.string().trim().min(1),
    order: z.number().int().min(0),
    sourceRefs: z.array(curriculumSourceRefSchema).min(1),
})

export const curriculumStrandStandardCatalogSchema = z.object({
    schemaVersion: z.literal(CURRICULUM_STRAND_STANDARD_SCHEMA_VERSION),
    strands: z.array(curriculumStrandSchema).min(1),
    standards: z.array(curriculumStandardSchema).min(1),
})

export type CurriculumStrand = z.infer<typeof curriculumStrandSchema>
export type CurriculumStandard = z.infer<typeof curriculumStandardSchema>
export type CurriculumStrandStandardCatalog = z.infer<typeof curriculumStrandStandardCatalogSchema>

const CORE_REF = (title: string): CurriculumSourceRef => ({
    provider: "core_curriculum",
    title,
    usage: "curriculum_reference",
})

const DOCX_REF: CurriculumSourceRef = {
    provider: "teacher",
    title: "Secondary core curriculum DOCX structure capture",
    usage: "structure_reference",
    note: "Derived from verified teacher-uploaded DOCX extraction for secondary core structure.",
}

const SUBJECT_STANDARD_CODE_PREFIX: Record<CanonicalSubjectId, string> = {
    thai: "ท",
    mathematics: "ค",
    science_technology: "ว",
    social_religion_culture: "ส",
    health_physical_education: "พ",
    arts: "ศ",
    career: "ง",
    foreign_languages: "ต",
    physics: "PHYS",
    chemistry: "CHEM",
    biology: "BIO",
    earth_space_science: "EARTH",
}

function buildStrand(
    id: string,
    subjectId: CanonicalSubjectId,
    code: string,
    labelTh: string,
    labelEn: string,
    order: number
): CurriculumStrand {
    return {
        id,
        subjectId,
        code,
        labelTh,
        labelEn,
        order,
        sourceRefs: [CORE_REF(`${labelTh} strand reference`), DOCX_REF],
    }
}

function buildStandard(
    id: string,
    subjectId: CanonicalSubjectId,
    strandId: string,
    code: string,
    labelTh: string,
    labelEn: string,
    order: number
): CurriculumStandard {
    return {
        id,
        subjectId,
        strandId,
        code,
        labelTh,
        labelEn,
        order,
        sourceRefs: [CORE_REF(`${code} standard reference`), DOCX_REF],
    }
}

const STRANDS: CurriculumStrand[] = [
    buildStrand("thai-reading", "thai", "TH-READ", "การอ่าน", "Reading", 0),
    buildStrand("thai-writing", "thai", "TH-WRITE", "การเขียน", "Writing", 1),
    buildStrand("thai-listening-speaking", "thai", "TH-LISTEN-SPEAK", "การฟัง การดู และการพูด", "Listening Viewing and Speaking", 2),
    buildStrand("thai-language-use", "thai", "TH-LANG", "หลักการใช้ภาษาไทย", "Thai Language Use", 3),
    buildStrand("thai-literature", "thai", "TH-LIT", "วรรณคดีและวรรณกรรม", "Literature", 4),

    buildStrand("math-number-algebra", "mathematics", "MATH-NUMALG", "จำนวนและพีชคณิต", "Number and Algebra", 0),
    buildStrand("math-measurement-geometry", "mathematics", "MATH-MEASGEO", "การวัดและเรขาคณิต", "Measurement and Geometry", 1),
    buildStrand("math-statistics-probability", "mathematics", "MATH-STATPROB", "สถิติและความน่าจะเป็น", "Statistics and Probability", 2),

    buildStrand("sci-life-science", "science_technology", "SCI-LIFE", "วิทยาศาสตร์ชีวภาพ", "Life Science", 0),
    buildStrand("sci-physical-science", "science_technology", "SCI-PHYSICAL", "วิทยาศาสตร์กายภาพ", "Physical Science", 1),
    buildStrand("sci-earth-space", "science_technology", "SCI-EARTHSPACE", "วิทยาศาสตร์โลก และอวกาศ", "Earth and Space Science", 2),
    buildStrand("sci-technology", "science_technology", "SCI-TECH", "เทคโนโลยี", "Technology", 3),

    buildStrand("phys-foundations-motion", "physics", "PHYS-MOTION", "ฟิสิกส์: ธรรมชาติ แรง และการเคลื่อนที่", "Physics Foundations, Force and Motion", 0),
    buildStrand("phys-waves-light-sound", "physics", "PHYS-WAVES", "ฟิสิกส์: คลื่น เสียง และแสง", "Waves Sound and Light", 1),
    buildStrand("phys-electricity-magnetism", "physics", "PHYS-EM", "ฟิสิกส์: ไฟฟ้า แม่เหล็ก และคลื่นแม่เหล็กไฟฟ้า", "Electricity Magnetism and Electromagnetic Waves", 2),
    buildStrand("phys-thermal-modern", "physics", "PHYS-MODERN", "ฟิสิกส์: ความร้อน ของไหล อะตอม และนิวเคลียร์", "Thermal Fluid Atomic and Nuclear Physics", 3),

    buildStrand("chem-atomic-bonding", "chemistry", "CHEM-ATOMIC", "เคมี: อะตอม ตารางธาตุ และพันธะเคมี", "Atomic Structure, Periodic Table and Chemical Bonding", 0),
    buildStrand("chem-quantitative", "chemistry", "CHEM-QUANT", "เคมี: ปริมาณสัมพันธ์และสารละลาย", "Stoichiometry and Solutions", 1),
    buildStrand("chem-kinetics-equilibrium", "chemistry", "CHEM-KINETICS", "เคมี: แก๊ส อัตราการเกิดปฏิกิริยา และสมดุลเคมี", "Gases, Reaction Rates and Chemical Equilibrium", 2),
    buildStrand("chem-acid-base-electro", "chemistry", "CHEM-ACIDBASE", "เคมี: กรด-เบส และเคมีไฟฟ้า", "Acids, Bases and Electrochemistry", 3),
    buildStrand("chem-organic-polymer", "chemistry", "CHEM-ORGANIC", "เคมี: เคมีอินทรีย์และพอลิเมอร์", "Organic Chemistry and Polymers", 4),

    buildStrand("bio-cell-chemistry", "biology", "BIO-CELL", "ชีววิทยา: ธรรมชาติของสิ่งมีชีวิตและเคมีของเซลล์", "Nature of Life and Cell Chemistry", 0),
    buildStrand("bio-genetics", "biology", "BIO-GENETICS", "ชีววิทยา: พันธุกรรม ยีน และเทคโนโลยีทางดีเอ็นเอ", "Heredity, Genes and DNA Technology", 1),
    buildStrand("bio-plant", "biology", "BIO-PLANT", "ชีววิทยา: โครงสร้าง การสังเคราะห์ด้วยแสง และการสืบพันธุ์ของพืช", "Plant Structure, Photosynthesis and Reproduction", 2),
    buildStrand("bio-animal-physiology", "biology", "BIO-PHYSIO", "ชีววิทยา: ระบบย่อยอาหาร หายใจ หมุนเวียนเลือด และขับถ่ายของสัตว์", "Animal Digestive, Respiratory, Circulatory and Excretory Systems", 3),
    buildStrand("bio-animal-systems", "biology", "BIO-SYSTEMS", "ชีววิทยา: การสืบพันธุ์ ระบบประสาท ต่อมไร้ท่อ การเคลื่อนที่ และพฤติกรรมของสัตว์", "Animal Reproduction, Nervous, Endocrine, Movement and Behaviour", 4),
    buildStrand("bio-ecology", "biology", "BIO-ECOLOGY", "ชีววิทยา: ความหลากหลายทางชีวภาพ ระบบนิเวศ และประชากร", "Biodiversity, Ecosystems and Populations", 5),

    buildStrand("earth-structure-tectonics", "earth_space_science", "EARTH-TECTONICS", "โลกฯ: โครงสร้างโลก ธรณีแปรสัณฐาน และธรณีพิบัติภัย", "Earth Structure, Plate Tectonics and Geohazards", 0),
    buildStrand("earth-resources-maps", "earth_space_science", "EARTH-RESOURCES", "โลกฯ: ทรัพยากรธรณีและแผนที่", "Geological Resources and Maps", 1),
    buildStrand("earth-atmosphere-ocean", "earth_space_science", "EARTH-OCEAN", "โลกฯ: บรรยากาศ ลม และการหมุนเวียนของน้ำในมหาสมุทร", "Atmosphere, Wind and Ocean Circulation", 2),
    buildStrand("earth-weather-climate", "earth_space_science", "EARTH-CLIMATE", "โลกฯ: เสถียรภาพอากาศ การเปลี่ยนแปลงภูมิอากาศ และการพยากรณ์อากาศ", "Air Stability, Climate Change and Weather Forecasting", 3),
    buildStrand("earth-astronomy", "earth_space_science", "EARTH-ASTRO", "โลกฯ: เอกภพ กาแล็กซี ดาวฤกษ์ และระบบสุริยะ", "The Universe, Galaxies, Stars and the Solar System", 4),
    buildStrand("earth-space-tech", "earth_space_science", "EARTH-SPACETECH", "โลกฯ: ตำแหน่งท้องฟ้า การเคลื่อนที่ปรากฏของดาว และเทคโนโลยีอวกาศ", "Celestial Coordinates, Apparent Motion and Space Technology", 5),

    buildStrand("social-religion-morality", "social_religion_culture", "SOCIAL-RELIGION", "ศาสนา ศีลธรรม จริยธรรม", "Religion Morality and Ethics", 0),
    buildStrand("social-civics-culture", "social_religion_culture", "SOCIAL-CIVICS", "หน้าที่พลเมือง วัฒนธรรม และการดำเนินชีวิตในสังคม", "Civics Culture and Social Life", 1),
    buildStrand("social-economics", "social_religion_culture", "SOCIAL-ECON", "เศรษฐศาสตร์", "Economics", 2),
    buildStrand("social-history", "social_religion_culture", "SOCIAL-HISTORY", "ประวัติศาสตร์", "History", 3),
    buildStrand("social-geography", "social_religion_culture", "SOCIAL-GEO", "ภูมิศาสตร์", "Geography", 4),

    buildStrand("health-human-development", "health_physical_education", "HEALTH-HUMAN", "การเจริญเติบโตและพัฒนาการของมนุษย์", "Human Growth and Development", 0),
    buildStrand("health-life-family", "health_physical_education", "HEALTH-FAMILY", "ชีวิตและครอบครัว", "Life and Family", 1),
    buildStrand("health-movement-exercise-sport", "health_physical_education", "HEALTH-MOVE", "การเคลื่อนไหว การออกกำลังกาย เกม กีฬา", "Movement Exercise Games and Sports", 2),
    buildStrand("health-health-promotion", "health_physical_education", "HEALTH-PROMOTE", "การสร้างเสริมสุขภาพ สมรรถภาพ และการป้องกันโรค", "Health Promotion and Disease Prevention", 3),
    buildStrand("health-safety", "health_physical_education", "HEALTH-SAFETY", "ความปลอดภัยในชีวิต", "Life Safety", 4),

    buildStrand("arts-visual-art", "arts", "ARTS-VISUAL", "ทัศนศิลป์", "Visual Arts", 0),
    buildStrand("arts-music", "arts", "ARTS-MUSIC", "ดนตรี", "Music", 1),
    buildStrand("arts-performance", "arts", "ARTS-PERFORM", "นาฏศิลป์", "Dance and Dramatic Arts", 2),

    buildStrand("career-work-living", "career", "CAREER-WORK", "การงานอาชีพ", "Career and Work", 0),

    buildStrand("lang-communication", "foreign_languages", "LANG-COMM", "ภาษาเพื่อการสื่อสาร", "Language for Communication", 0),
    buildStrand("lang-culture", "foreign_languages", "LANG-CULTURE", "ภาษาและวัฒนธรรม", "Language and Culture", 1),
    buildStrand("lang-other-subjects", "foreign_languages", "LANG-CROSS", "ภาษากับความสัมพันธ์กับกลุ่มสาระการเรียนรู้อื่น", "Language and Other Learning Areas", 2),
    buildStrand("lang-community-world", "foreign_languages", "LANG-WORLD", "ภาษากับความสัมพันธ์กับชุมชนและโลก", "Language Community and the World", 3),
]

const STANDARDS: CurriculumStandard[] = [
    buildStandard("thai-th1_1", "thai", "thai-reading", "ท 1.1", "ใช้กระบวนการอ่านสร้างความรู้และความคิดเพื่อนำไปใช้ตัดสินใจ แก้ปัญหา และสร้างวิสัยทัศน์ในการดำเนินชีวิต", "Apply reading processes to build knowledge, thinking, and informed decision-making.", 0),
    buildStandard("thai-th2_1", "thai", "thai-writing", "ท 2.1", "ใช้กระบวนการเขียน เขียนสื่อสาร เขียนเรียงความ ย่อความ และเขียนเรื่องราวในรูปแบบต่าง ๆ", "Use writing processes for communication and varied forms of composition.", 0),
    buildStandard("thai-th3_1", "thai", "thai-listening-speaking", "ท 3.1", "สามารถเลือกฟังและดูอย่างมีวิจารณญาณ และพูดแสดงความรู้ ความคิด และความรู้สึกในโอกาสต่าง ๆ", "Listen, view, and speak critically and appropriately in varied contexts.", 0),
    buildStandard("thai-th4_1", "thai", "thai-language-use", "ท 4.1", "เข้าใจธรรมชาติของภาษาและหลักภาษาไทย การเปลี่ยนแปลงของภาษา และพลังของภาษา", "Understand the nature, rules, change, and power of Thai language.", 0),
    buildStandard("thai-th5_1", "thai", "thai-literature", "ท 5.1", "เข้าใจและแสดงความคิดเห็น วิจารณ์วรรณคดีและวรรณกรรมไทยอย่างเห็นคุณค่า", "Understand and appreciate Thai literature and literary criticism.", 0),

    buildStandard("math-k1_1", "mathematics", "math-number-algebra", "ค 1.1", "เข้าใจความหลากหลายของการแสดงจำนวน ระบบจำนวน การดำเนินการของจำนวน และใช้เหตุผลเกี่ยวกับจำนวน", "Understand number representations, systems, operations, and numerical reasoning.", 0),
    buildStandard("math-k1_2", "mathematics", "math-number-algebra", "ค 1.2", "เข้าใจและวิเคราะห์แบบรูป ความสัมพันธ์ ฟังก์ชัน ลำดับและอนุกรม และนำไปใช้", "Understand patterns, relations, functions, sequences, and series.", 1),
    buildStandard("math-k1_3", "mathematics", "math-number-algebra", "ค 1.3", "ใช้สมการ อสมการ และเมทริกซ์อธิบายความสัมพันธ์หรือช่วยแก้ปัญหา", "Use equations, inequalities, and matrices to describe relations and solve problems.", 2),
    buildStandard("math-k2_1", "mathematics", "math-measurement-geometry", "ค 2.1", "เข้าใจพื้นฐานเกี่ยวกับการวัด วัดและคาดคะเนขนาดของสิ่งที่ต้องการวัด และนำไปใช้", "Understand measurement foundations and apply them in practice.", 0),
    buildStandard("math-k2_2", "mathematics", "math-measurement-geometry", "ค 2.2", "เข้าใจและวิเคราะห์รูปเรขาคณิต สมบัติของรูปเรขาคณิต ความสัมพันธ์ และนำไปใช้", "Understand geometry, geometric properties, and spatial relationships.", 1),
    buildStandard("math-k3_1", "mathematics", "math-statistics-probability", "ค 3.1", "เข้าใจกระบวนการทางสถิติและใช้ความรู้ทางสถิติในการแก้ปัญหา", "Understand statistical processes and apply statistics to problem solving.", 0),
    buildStandard("math-k3_2", "mathematics", "math-statistics-probability", "ค 3.2", "เข้าใจหลักการนับเบื้องต้น ความน่าจะเป็น และนำไปใช้", "Understand basic counting principles, probability, and their applications.", 1),

    buildStandard("sci-w1_1", "science_technology", "sci-life-science", "ว 1.1", "เข้าใจความหลากหลายของระบบนิเวศ ความสัมพันธ์ระหว่างสิ่งไม่มีชีวิตกับสิ่งมีชีวิต และการถ่ายทอดพลังงาน", "Understand ecosystems, organism interactions, and energy transfer.", 0),
    buildStandard("sci-w1_2", "science_technology", "sci-life-science", "ว 1.2", "เข้าใจสมบัติของสิ่งมีชีวิต หน่วยพื้นฐานของสิ่งมีชีวิต การลำเลียงสาร และการดำรงชีวิตของพืชและสัตว์", "Understand living things, cells, transport, and life processes.", 1),
    buildStandard("sci-w1_3", "science_technology", "sci-life-science", "ว 1.3", "เข้าใจกระบวนการและความสำคัญของการถ่ายทอดลักษณะทางพันธุกรรม ความหลากหลายทางชีวภาพ และวิวัฒนาการ", "Understand heredity, biodiversity, and evolution.", 2),
    buildStandard("sci-w2_1", "science_technology", "sci-physical-science", "ว 2.1", "เข้าใจสมบัติของสสาร องค์ประกอบของสสาร ความสัมพันธ์ระหว่างสมบัติของสสารกับโครงสร้างและแรงยึดเหนี่ยว", "Understand matter, composition, structure, and related properties.", 0),
    buildStandard("sci-w2_2", "science_technology", "sci-physical-science", "ว 2.2", "เข้าใจธรรมชาติของแรงในชีวิตประจำวัน ผลของแรงต่อการเคลื่อนที่ พลังงาน และการเปลี่ยนรูปพลังงาน", "Understand force, motion, and energy transformation.", 1),
    buildStandard("sci-w2_3", "science_technology", "sci-physical-science", "ว 2.3", "เข้าใจความหมายของพลังงาน การเปลี่ยนแปลงพลังงาน ปฏิสัมพันธ์ระหว่างสสารและพลังงาน รวมทั้งคลื่น แสง และเสียง", "Understand energy, matter-energy interaction, waves, light, and sound.", 2),
    buildStandard("sci-w3_1", "science_technology", "sci-earth-space", "ว 3.1", "เข้าใจองค์ประกอบ ลักษณะ กระบวนการเกิด และวิวัฒนาการของเอกภพ กาแล็กซี ดาวฤกษ์ และระบบสุริยะ", "Understand the universe, galaxies, stars, and the solar system.", 0),
    buildStandard("sci-w3_2", "science_technology", "sci-earth-space", "ว 3.2", "เข้าใจองค์ประกอบและความสัมพันธ์ของระบบโลก กระบวนการเปลี่ยนแปลงทางธรณีวิทยา และผลต่อสิ่งมีชีวิตและสิ่งแวดล้อม", "Understand Earth systems, geologic processes, and environmental impacts.", 1),
    buildStandard("sci-w4_1", "science_technology", "sci-technology", "ว 4.1", "เข้าใจแนวคิดหลักของเทคโนโลยีเพื่อการดำรงชีวิตในสังคม มีการเปลี่ยนแปลงอย่างรวดเร็ว ใช้ความรู้และทักษะในการแก้ปัญหาอย่างเหมาะสม", "Understand technology concepts and use them appropriately for problem solving in society.", 0),
    buildStandard("sci-w4_2", "science_technology", "sci-technology", "ว 4.2", "เข้าใจและใช้แนวคิดเชิงคำนวณในการแก้ปัญหา พบกับสถานการณ์ใหม่อย่างเป็นระบบ ใช้เทคโนโลยีสารสนเทศอย่างปลอดภัย", "Use computational thinking and information technology safely and systematically.", 1),

    buildStandard("phys-p1_1", "physics", "phys-foundations-motion", "PHYS 1.1", "เข้าใจธรรมชาติของฟิสิกส์ การวัด แรง การเคลื่อนที่ งาน พลังงาน โมเมนตัม และสมดุลกล รวมทั้งนำความรู้ไปใช้ประโยชน์", "Understand physics foundations, measurement, force, motion, work, energy, momentum, and equilibrium.", 0),
    buildStandard("phys-p2_1", "physics", "phys-waves-light-sound", "PHYS 2.1", "เข้าใจการเคลื่อนที่แบบฮาร์มอนิก คลื่นกล เสียง แสง และการมองเห็น รวมทั้งนำความรู้ไปใช้ประโยชน์", "Understand harmonic motion, mechanical waves, sound, light, and vision.", 0),
    buildStandard("phys-p3_1", "physics", "phys-electricity-magnetism", "PHYS 3.1", "เข้าใจไฟฟ้าสถิต กระแสไฟฟ้า แม่เหล็กไฟฟ้า ไฟฟ้ากระแสสลับ คลื่นแม่เหล็กไฟฟ้า และการสื่อสาร", "Understand electrostatics, electric current, electromagnetism, alternating current, electromagnetic waves, and communication.", 0),
    buildStandard("phys-p4_1", "physics", "phys-thermal-modern", "PHYS 4.1", "เข้าใจความร้อน แก๊ส ของแข็ง ของไหล ฟิสิกส์อะตอม ฟิสิกส์นิวเคลียร์ และฟิสิกส์อนุภาค รวมทั้งนำความรู้ไปใช้ประโยชน์", "Understand heat, gas, solids, fluids, atomic physics, nuclear physics, and particle physics.", 0),

    buildStandard("chem-c1_1", "chemistry", "chem-atomic-bonding", "CHEM 1.1", "เข้าใจโครงสร้างอะตอม การจัดเรียงธาตุในตารางธาตุ และการเกิดพันธะเคมี รวมทั้งนำความรู้ไปใช้ประโยชน์", "Understand atomic structure, the periodic table, and chemical bonding.", 0),
    buildStandard("chem-c2_1", "chemistry", "chem-quantitative", "CHEM 2.1", "เข้าใจปริมาณสัมพันธ์ มวลอะตอมและโมเลกุล ความเข้มข้นของสารละลาย และการคำนวณปริมาณสารในปฏิกิริยาเคมี", "Understand stoichiometry, atomic and molecular mass, solution concentration, and reaction quantity calculations.", 0),
    buildStandard("chem-c3_1", "chemistry", "chem-kinetics-equilibrium", "CHEM 3.1", "เข้าใจสมบัติของแก๊ส อัตราการเกิดปฏิกิริยาเคมี และภาวะสมดุลเคมี รวมทั้งนำความรู้ไปใช้ประโยชน์", "Understand gas properties, reaction rates, and chemical equilibrium.", 0),
    buildStandard("chem-c4_1", "chemistry", "chem-acid-base-electro", "CHEM 4.1", "เข้าใจสมบัติของกรด-เบส ปฏิกิริยารีดอกซ์ และเซลล์ไฟฟ้าเคมี รวมทั้งนำความรู้ไปใช้ประโยชน์", "Understand acid-base properties, redox reactions, and electrochemical cells.", 0),
    buildStandard("chem-c5_1", "chemistry", "chem-organic-polymer", "CHEM 5.1", "เข้าใจโครงสร้างและสมบัติของสารประกอบอินทรีย์และพอลิเมอร์ รวมทั้งการนำความรู้ทางเคมีไปใช้แก้ปัญหา", "Understand the structure and properties of organic compounds and polymers, and apply chemistry to solve problems.", 0),

    buildStandard("bio-b1_1", "biology", "bio-cell-chemistry", "BIO 1.1", "เข้าใจธรรมชาติของสิ่งมีชีวิต สารเคมีที่เป็นองค์ประกอบของเซลล์ และการลำเลียงสารผ่านเซลล์ รวมทั้งการแบ่งเซลล์และการหายใจระดับเซลล์", "Understand the nature of living things, cell chemistry, cell transport, cell division, and cellular respiration.", 0),
    buildStandard("bio-b2_1", "biology", "bio-genetics", "BIO 2.1", "เข้าใจการถ่ายทอดลักษณะทางพันธุกรรม ยีนและโครโมโซม และการนำเทคโนโลยีทางดีเอ็นเอไปใช้ประโยชน์", "Understand heredity, genes and chromosomes, and the application of DNA technology.", 0),
    buildStandard("bio-b3_1", "biology", "bio-plant", "BIO 3.1", "เข้าใจโครงสร้างและหน้าที่ของพืชดอก การสังเคราะห์ด้วยแสง การสืบพันธุ์ และการตอบสนองของพืช", "Understand flowering plant structure and function, photosynthesis, reproduction, and plant responses.", 0),
    buildStandard("bio-b4_1", "biology", "bio-animal-physiology", "BIO 4.1", "เข้าใจโครงสร้างและหน้าที่ของระบบย่อยอาหาร ระบบหายใจ ระบบหมุนเวียนเลือด และระบบขับถ่ายของสัตว์", "Understand the structure and function of animal digestive, respiratory, circulatory, and excretory systems.", 0),
    buildStandard("bio-b5_1", "biology", "bio-animal-systems", "BIO 5.1", "เข้าใจการสืบพันธุ์และการเจริญเติบโต ระบบประสาท ระบบต่อมไร้ท่อ การเคลื่อนที่ และพฤติกรรมของสัตว์", "Understand animal reproduction and growth, the nervous and endocrine systems, movement, and behaviour.", 0),
    buildStandard("bio-b6_1", "biology", "bio-ecology", "BIO 6.1", "เข้าใจความหลากหลายทางชีวภาพ ระบบนิเวศ พลวัตของประชากร และแนวทางการอนุรักษ์สิ่งแวดล้อม", "Understand biodiversity, ecosystems, population dynamics, and environmental conservation.", 0),

    buildStandard("earth-e1_1", "earth_space_science", "earth-structure-tectonics", "EARTH 1.1", "เข้าใจโครงสร้างโลก ธรณีแปรสัณฐาน ธรณีพิบัติภัย และการลำดับชั้นหิน", "Understand Earth's structure, plate tectonics, geohazards, and stratigraphy.", 0),
    buildStandard("earth-e2_1", "earth_space_science", "earth-resources-maps", "EARTH 2.1", "เข้าใจทรัพยากรธรณีและการอ่านแปลความหมายแผนที่ภูมิประเทศและแผนที่ธรณีวิทยา", "Understand geological resources and the interpretation of topographic and geological maps.", 0),
    buildStandard("earth-e3_1", "earth_space_science", "earth-atmosphere-ocean", "EARTH 3.1", "เข้าใจองค์ประกอบของบรรยากาศ การหมุนเวียนของลม และการหมุนเวียนของน้ำในมหาสมุทร", "Understand atmospheric composition, wind circulation, and ocean circulation.", 0),
    buildStandard("earth-e4_1", "earth_space_science", "earth-weather-climate", "EARTH 4.1", "เข้าใจเสถียรภาพอากาศ แนวปะทะอากาศ การเปลี่ยนแปลงภูมิอากาศของโลก และการพยากรณ์อากาศ", "Understand air stability, air masses and fronts, global climate change, and weather forecasting.", 0),
    buildStandard("earth-e5_1", "earth_space_science", "earth-astronomy", "EARTH 5.1", "เข้าใจกำเนิดและวิวัฒนาการของเอกภพ กาแล็กซี ดาวฤกษ์ และระบบสุริยะ", "Understand the origin and evolution of the universe, galaxies, stars, and the solar system.", 0),
    buildStandard("earth-e6_1", "earth_space_science", "earth-space-tech", "EARTH 6.1", "เข้าใจการระบุตำแหน่งบนทรงกลมฟ้า การเคลื่อนที่ปรากฏของดวงดาว และการประยุกต์ใช้เทคโนโลยีอวกาศ", "Understand celestial coordinate systems, the apparent motion of celestial objects, and applications of space technology.", 0),

    buildStandard("social-s1_1", "social_religion_culture", "social-religion-morality", "ส 1.1", "รู้และเข้าใจประวัติ ความสำคัญ ศาสดา หลักธรรมของพระพุทธศาสนาหรือศาสนาที่ตนนับถือ", "Understand core religious history, importance, and principles.", 0),
    buildStandard("social-s1_2", "social_religion_culture", "social-religion-morality", "ส 1.2", "ยึดมั่นและปฏิบัติตนตามหลักธรรมเพื่ออยู่ร่วมกันอย่างสันติสุข", "Apply moral principles for peaceful coexistence.", 1),
    buildStandard("social-s2_1", "social_religion_culture", "social-civics-culture", "ส 2.1", "เข้าใจและปฏิบัติตนตามหน้าที่ของการเป็นพลเมืองดี มีค่านิยมที่ดีงาม และธำรงรักษาประเพณีและวัฒนธรรมไทย", "Practice good citizenship and preserve Thai culture and traditions.", 0),
    buildStandard("social-s2_2", "social_religion_culture", "social-civics-culture", "ส 2.2", "เข้าใจระบบการเมืองการปกครองในสังคมปัจจุบัน ยึดมั่น ศรัทธา และธำรงรักษาไว้ซึ่งการปกครองระบอบประชาธิปไตย", "Understand political systems and uphold democratic governance.", 1),
    buildStandard("social-s3_1", "social_religion_culture", "social-economics", "ส 3.1", "เข้าใจและสามารถบริหารจัดการทรัพยากรในการผลิตและการบริโภคอย่างมีประสิทธิภาพ", "Manage production and consumption resources efficiently.", 0),
    buildStandard("social-s3_2", "social_religion_culture", "social-economics", "ส 3.2", "เข้าใจระบบและสถาบันทางเศรษฐกิจต่าง ๆ ความสัมพันธ์ทางเศรษฐกิจ และความจำเป็นของการร่วมมือกันทางเศรษฐกิจ", "Understand economic systems, institutions, and cooperation.", 1),
    buildStandard("social-s4_1", "social_religion_culture", "social-history", "ส 4.1", "เข้าใจความหมาย ความสำคัญของเวลาและยุคสมัยทางประวัติศาสตร์ และใช้วิธีการทางประวัติศาสตร์วิเคราะห์เหตุการณ์", "Understand historical time, eras, and historical inquiry.", 0),
    buildStandard("social-s4_2", "social_religion_culture", "social-history", "ส 4.2", "เข้าใจพัฒนาการของมนุษยชาติจากอดีตจนถึงปัจจุบันในด้านความสัมพันธ์และการเปลี่ยนแปลง", "Understand human development and change from past to present.", 1),
    buildStandard("social-s4_3", "social_religion_culture", "social-history", "ส 4.3", "เข้าใจความเป็นมาของชาติไทย วัฒนธรรม ภูมิปัญญาไทย และมีความภาคภูมิใจและธำรงรักษาการเป็นไทย", "Understand Thai national heritage, culture, wisdom, and national identity.", 2),
    buildStandard("social-s5_1", "social_religion_culture", "social-geography", "ส 5.1", "เข้าใจลักษณะของโลกทางกายภาพ และความสัมพันธ์ของสรรพสิ่งซึ่งมีผลต่อกัน", "Understand the physical world and its interrelationships.", 0),
    buildStandard("social-s5_2", "social_religion_culture", "social-geography", "ส 5.2", "เข้าใจปฏิสัมพันธ์ระหว่างมนุษย์กับสภาพแวดล้อมทางกายภาพที่ก่อให้เกิดการสร้างสรรค์วัฒนธรรม", "Understand human-environment interaction and cultural formation.", 1),

    buildStandard("health-p1_1", "health_physical_education", "health-human-development", "พ 1.1", "เข้าใจธรรมชาติของการเจริญเติบโตและพัฒนาการของมนุษย์", "Understand human growth and development.", 0),
    buildStandard("health-p2_1", "health_physical_education", "health-life-family", "พ 2.1", "เข้าใจและเห็นคุณค่าตนเอง ครอบครัว เพศศึกษา และมีทักษะในการดำเนินชีวิต", "Value self, family, sex education, and life skills.", 0),
    buildStandard("health-p3_1", "health_physical_education", "health-movement-exercise-sport", "พ 3.1", "เข้าใจและมีทักษะในการเคลื่อนไหว การออกกำลังกาย การเล่นเกม และกีฬา", "Understand and apply movement, exercise, game, and sport skills.", 0),
    buildStandard("health-p4_1", "health_physical_education", "health-health-promotion", "พ 4.1", "เห็นคุณค่าและมีทักษะในการสร้างเสริมสุขภาพ การดำรงสุขภาพ การป้องกันโรค และการสร้างเสริมสมรรถภาพเพื่อสุขภาพ", "Promote health, prevent disease, and build fitness.", 0),
    buildStandard("health-p5_1", "health_physical_education", "health-safety", "พ 5.1", "ป้องกันและหลีกเลี่ยงปัจจัยเสี่ยง พฤติกรรมเสี่ยงต่อสุขภาพ อุบัติเหตุ และความรุนแรง", "Avoid health risks, accidents, and violence.", 0),

    buildStandard("arts-s1_1", "arts", "arts-visual-art", "ศ 1.1", "สร้างสรรค์งานทัศนศิลป์ตามจินตนาการ และวิเคราะห์ วิพากษ์ วิจารณ์คุณค่างานทัศนศิลป์", "Create and critique visual art.", 0),
    buildStandard("arts-s2_1", "arts", "arts-music", "ศ 2.1", "เข้าใจและแสดงออกทางดนตรีอย่างสร้างสรรค์ วิเคราะห์ วิพากษ์ วิจารณ์คุณค่าดนตรี", "Understand, perform, and critique music creatively.", 0),
    buildStandard("arts-s3_1", "arts", "arts-performance", "ศ 3.1", "เข้าใจและแสดงออกทางนาฏศิลป์อย่างสร้างสรรค์ วิเคราะห์ วิพากษ์ วิจารณ์คุณค่านาฏศิลป์", "Understand, perform, and critique dance and dramatic arts creatively.", 0),
    buildStandard("arts-s3_2", "arts", "arts-performance", "ศ 3.2", "เข้าใจความสัมพันธ์ระหว่างนาฏศิลป์ การแสดง และวัฒนธรรม เห็นคุณค่าและนำไปใช้", "Understand relationships among dance, performance, and culture, and apply them meaningfully.", 1),

    buildStandard("career-ng1_1", "career", "career-work-living", "ง 1.1", "เข้าใจการทำงาน มีความคิดสร้างสรรค์ มีทักษะกระบวนการทำงาน ทักษะการจัดการ และคุณธรรมในการทำงาน", "Understand work, creativity, management skills, and work ethics.", 0),
    buildStandard("career-ng2_1", "career", "career-work-living", "ง 2.1", "เข้าใจทักษะอาชีพ การจัดการ การใช้เทคโนโลยี และการทำงานเพื่อการดำรงชีวิตและอาชีพ", "Understand career skills, management, technology use, and work for life and occupations.", 1),

    buildStandard("lang-t1_1", "foreign_languages", "lang-communication", "ต 1.1", "เข้าใจและตีความเรื่องที่ฟังและอ่านจากสื่อประเภทต่าง ๆ และแสดงความคิดเห็นอย่างมีเหตุผล", "Understand and interpret listened and read materials with reasoned response.", 0),
    buildStandard("lang-t1_2", "foreign_languages", "lang-communication", "ต 1.2", "มีทักษะการสื่อสารทางภาษาในการแลกเปลี่ยนข้อมูลข่าวสาร แสดงความรู้สึก และความคิดเห็นอย่างมีประสิทธิภาพ", "Communicate effectively to exchange information, feelings, and opinions.", 1),
    buildStandard("lang-t1_3", "foreign_languages", "lang-communication", "ต 1.3", "นำเสนอข้อมูลข่าวสาร ความคิดรวบยอด และความคิดเห็นในเรื่องต่าง ๆ โดยการพูดและการเขียน", "Present information and ideas through speaking and writing.", 2),
    buildStandard("lang-t2_1", "foreign_languages", "lang-culture", "ต 2.1", "เข้าใจความสัมพันธ์ระหว่างภาษากับวัฒนธรรมของเจ้าของภาษา และนำไปใช้อย่างเหมาะสม", "Understand language-culture relationships and use them appropriately.", 0),
    buildStandard("lang-t2_2", "foreign_languages", "lang-culture", "ต 2.2", "เข้าใจความเหมือนและความแตกต่างระหว่างภาษาและวัฒนธรรมของเจ้าของภาษากับภาษาและวัฒนธรรมไทย และนำมาใช้อย่างถูกต้อง", "Compare target-language cultures with Thai culture appropriately.", 1),
    buildStandard("lang-t3_1", "foreign_languages", "lang-other-subjects", "ต 3.1", "ใช้ภาษาต่างประเทศในการเชื่อมโยงความรู้กับกลุ่มสาระการเรียนรู้อื่น และเป็นพื้นฐานในการพัฒนาแสวงหาความรู้", "Use foreign languages to connect learning across subject areas.", 0),
    buildStandard("lang-t4_1", "foreign_languages", "lang-community-world", "ต 4.1", "ใช้ภาษาต่างประเทศในสถานการณ์ต่าง ๆ ทั้งในสถานศึกษา ชุมชน และสังคม", "Use foreign languages in school, community, and social contexts.", 0),
    buildStandard("lang-t4_2", "foreign_languages", "lang-community-world", "ต 4.2", "ใช้ภาษาต่างประเทศเป็นเครื่องมือพื้นฐานในการศึกษาต่อ การประกอบอาชีพ และการแลกเปลี่ยนเรียนรู้กับสังคมโลก", "Use foreign languages for further study, careers, and global exchange.", 1),
]

export const CURRICULUM_STRAND_STANDARD_CATALOG: CurriculumStrandStandardCatalog = {
    schemaVersion: CURRICULUM_STRAND_STANDARD_SCHEMA_VERSION,
    strands: STRANDS,
    standards: STANDARDS,
}

function hasUniqueValues(values: string[]) {
    return new Set(values).size === values.length
}

function matchesSubjectStandardCodePrefix(subjectId: CanonicalSubjectId, code: string) {
    const prefix = SUBJECT_STANDARD_CODE_PREFIX[subjectId]
    return code.startsWith(prefix)
}

export function validateCurriculumStrandStandardCatalog(value: unknown) {
    const parsed = curriculumStrandStandardCatalogSchema.safeParse(value)
    if (!parsed.success) {
        return parsed
    }

    const issues: z.ZodIssue[] = []
    const strandMap = new Map(parsed.data.strands.map((strand) => [strand.id, strand]))

    if (!hasUniqueValues(parsed.data.strands.map((strand) => strand.id))) {
        issues.push({
            code: z.ZodIssueCode.custom,
            message: "Curriculum strand ids must be unique.",
            path: ["strands"],
        })
    }

    if (!hasUniqueValues(parsed.data.standards.map((standard) => standard.id))) {
        issues.push({
            code: z.ZodIssueCode.custom,
            message: "Curriculum standard ids must be unique.",
            path: ["standards"],
        })
    }

    parsed.data.strands.forEach((strand, index) => {
        if (!getCanonicalSubjectById(strand.subjectId)) {
            issues.push({
                code: z.ZodIssueCode.custom,
                message: "Strand subjectId must reference an existing canonical core subject.",
                path: ["strands", index, "subjectId"],
            })
        }
    })

    parsed.data.standards.forEach((standard, index) => {
        const strand = strandMap.get(standard.strandId)

        if (!strand) {
            issues.push({
                code: z.ZodIssueCode.custom,
                message: "Standard strandId must reference an existing curriculum strand.",
                path: ["standards", index, "strandId"],
            })
            return
        }

        if (strand.subjectId !== standard.subjectId) {
            issues.push({
                code: z.ZodIssueCode.custom,
                message: "Standard subjectId must match the subjectId of its strand.",
                path: ["standards", index, "subjectId"],
            })
        }

        if (!matchesSubjectStandardCodePrefix(standard.subjectId, standard.code)) {
            issues.push({
                code: z.ZodIssueCode.custom,
                message: "Standard code prefix must match the owning subject.",
                path: ["standards", index, "code"],
            })
        }
    })

    if (issues.length === 0) {
        return {
            success: true as const,
            data: parsed.data,
        }
    }

    return {
        success: false as const,
        error: new z.ZodError(issues),
    }
}

export function isCurriculumStrandStandardCatalog(value: unknown): value is CurriculumStrandStandardCatalog {
    return validateCurriculumStrandStandardCatalog(value).success
}

export function getCurriculumStrandsForSubject(subjectId: CanonicalSubjectId) {
    return CURRICULUM_STRAND_STANDARD_CATALOG.strands
        .filter((strand) => strand.subjectId === subjectId)
        .sort((left, right) => left.order - right.order)
}

export function getCurriculumStrandById(strandId: string) {
    return CURRICULUM_STRAND_STANDARD_CATALOG.strands.find((strand) => strand.id === strandId) ?? null
}

export function getCurriculumStandardById(standardId: string) {
    return CURRICULUM_STRAND_STANDARD_CATALOG.standards.find((standard) => standard.id === standardId) ?? null
}

export function getStandardsForSubjectAndStrand(subjectId: CanonicalSubjectId, strandId: string) {
    const strand = getCurriculumStrandById(strandId)
    if (!strand || strand.subjectId !== subjectId) {
        return []
    }

    return CURRICULUM_STRAND_STANDARD_CATALOG.standards
        .filter((standard) => standard.subjectId === subjectId && standard.strandId === strandId)
        .sort((left, right) => left.order - right.order)
}
