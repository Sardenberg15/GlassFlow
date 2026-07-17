import { DatabaseStorage } from "../server/storage.js";

async function main() {
    try {
        const storage = new DatabaseStorage();
        const projects = await storage.getProjects();
        console.log("Projects loaded:", projects.length);
    } catch (err) {
        console.error("STORAGE ERROR:", err);
    }
    process.exit(0);
}
main();
