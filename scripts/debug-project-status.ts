
import { storage } from "../server/storage";

async function checkProject() {
    const projects = await storage.getProjects();
    const target = projects.find(p => p.name.includes("FACHADA") || p.name.includes("GLAZING") || p.name.includes("PORTÃO") || p.name.includes("PORTA DE VIDRO"));

    if (target) {
        console.log("Project Found:", target.name);
        console.log("Status:", target.status);
        console.log("ID:", target.id);

        const bills = await storage.getBillsByProject(target.id);
        console.log("Bills for this project:", bills);
    } else {
        console.log("Project not found matching keywords.");
        console.log("Available projects:", projects.map(p => p.name));
    }
}

checkProject();
