import express from 'express';
import { getTableList, getFieldList, getData } from '../controllers/apiController.js';

const router = express.Router();

router.get('/getTableList', getTableList);
router.get('/:table/getFields', getFieldList);
router.get('/:table/getData', getData);

export default router;

