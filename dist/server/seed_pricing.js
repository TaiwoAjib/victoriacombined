"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const XLSX = __importStar(require("xlsx"));
const path_1 = __importDefault(require("path"));
const prisma = new client_1.PrismaClient();
async function main() {
    // Path to the Excel file
    const filePath = path_1.default.join(__dirname, '../pricing_data.xlsx');
    console.log(`Reading file from: ${filePath}`);
    if (!require('fs').existsSync(filePath)) {
        console.error('File not found! Please ensure pricing_data.xlsx exists in the backend folder.');
        process.exit(1);
    }
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        // Convert to JSON
        // We assume the first row contains headers. 
        // If your headers are "StyleId", "CategoryId", "Price", "Time"
        const data = XLSX.utils.sheet_to_json(sheet);
        console.log(`Found ${data.length} records. Processing...`);
        let successCount = 0;
        let errorCount = 0;
        for (const row of data) {
            // Normalize keys (handle case sensitivity or variations)
            let styleId = row['StyleId'] || row['styleId'] || row['Style ID'];
            let categoryId = row['CategoryId'] || row['categoryId'] || row['Category ID'];
            const styleName = row['Style Name'] || row['styleName'] || row['Style'] || row['Service Name']; // Added Service Name for compatibility
            const categoryName = row['Category Name'] || row['categoryName'] || row['Category'] || row['Variation'];
            const price = row['Price'] || row['price'];
            // "Time" column is in hours, need to convert to minutes
            const timeHours = row['Time'] || row['time'] || row['Duration'] || row['Hours'];
            // If IDs are missing but Names are provided, lookup IDs
            if ((!styleId && styleName) || (!categoryId && categoryName)) {
                try {
                    if (!styleId && styleName) {
                        const style = await prisma.style.findFirst({
                            where: { name: { equals: styleName, mode: 'insensitive' } }
                        });
                        if (style)
                            styleId = style.id;
                        else
                            console.warn(`Style not found: ${styleName}`);
                    }
                    if (!categoryId && categoryName) {
                        const category = await prisma.category.findFirst({
                            where: { name: { equals: categoryName, mode: 'insensitive' } }
                        });
                        if (category)
                            categoryId = category.id;
                        else
                            console.warn(`Category not found: ${categoryName}`);
                    }
                }
                catch (lookupError) {
                    console.error('Error looking up IDs:', lookupError);
                }
            }
            if (!styleId || !categoryId || !price || timeHours === undefined) {
                console.warn(`Skipping row due to missing data: Style=${styleId || styleName}, Category=${categoryId || categoryName}, Price=${price}`);
                errorCount++;
                continue;
            }
            try {
                // Convert hours to minutes
                // e.g. 1.5 hours -> 90 minutes
                const durationMinutes = Math.round(parseFloat(timeHours) * 60);
                await prisma.stylePricing.upsert({
                    where: {
                        styleId_categoryId: {
                            styleId: styleId.toString().trim(),
                            categoryId: categoryId.toString().trim()
                        }
                    },
                    update: {
                        price: parseFloat(price),
                        durationMinutes: durationMinutes
                    },
                    create: {
                        styleId: styleId.toString().trim(),
                        categoryId: categoryId.toString().trim(),
                        price: parseFloat(price),
                        durationMinutes: durationMinutes
                    }
                });
                successCount++;
            }
            catch (err) {
                console.error(`Failed to upsert for Style ${styleId} / Category ${categoryId}:`, err);
                errorCount++;
            }
        }
        console.log('Seeding completed.');
        console.log(`Successfully processed: ${successCount}`);
        console.log(`Errors/Skipped: ${errorCount}`);
    }
    catch (error) {
        console.error('Error reading or processing file:', error);
    }
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
