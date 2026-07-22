"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const availabilityController_1 = require("../controllers/availabilityController");
const router = express_1.default.Router();
router.get('/', availabilityController_1.getAvailability);
router.post('/', availabilityController_1.setAvailability); // Admin only
exports.default = router;
