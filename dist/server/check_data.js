"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const categories = await prisma.category.findMany({ take: 5 });
    console.log('Categories:', categories);
    const styles = await prisma.style.findMany({ take: 5 });
    console.log('Styles:', styles);
}
main()
    .catch(e => console.error(e))
    .finally(async () => {
    await prisma.$disconnect();
});
