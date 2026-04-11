const fs = require('fs');
const file = 'src/controller/campaignController.ts';
let code = fs.readFileSync(file, 'utf8');

// Replace the functions definition
const funcDefRegex = /function getCampaignRepo\(\) \{[\s\S]*?function getReportRepo\(\) \{[\s\S]*?\}\n/g;
code = code.replace(funcDefRegex, `const CampaignRepo = AppDataSource.getRepository(Campaign);
const ParticipantRepo = AppDataSource.getRepository(CampaignParticipant);
const ReportRepo = AppDataSource.getRepository(WasteReport);
`);

// Also remove the user's manual "const CampaignRepo = ..." before getDistanceFromLatLonInM just in case
code = code.replace(/const CampaignRepo = AppDataSource\.getRepository\(Campaign\);\n*\n*function getDistanceFromLatLonInM/, 'function getDistanceFromLatLonInM');

code = code.replace(/getCampaignRepo\(\)/g, 'CampaignRepo');
code = code.replace(/getParticipantRepo\(\)/g, 'ParticipantRepo');
code = code.replace(/getReportRepo\(\)/g, 'ReportRepo');

fs.writeFileSync(file, code);
console.log('Refactoring applied');
