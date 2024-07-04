import { Citation } from './src/index';
import params from './main.json';

const citation = new Citation(params.width, params.height, params.barcode);

citation.title = params.title;
citation.reason = params.violation + '\n' + params.reason;
citation.penalty = params.penalty;
citation.resizeReason = true;

if (params.fileType == 'png') {
    citation.render('citation.png');
} else if (params.fileType == 'gif') {
    citation.render('citation.gif', true);
} else {
    console.error('Invalid file type! Please choose either .png or .gif');
}