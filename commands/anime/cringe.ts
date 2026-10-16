import { animeMaker } from '#anime';

export default animeMaker({
    command: ['verguenza', 'cringe', 'vergüenza'],
    api: 'cringe',
    description: 'Muestra vergüenza ajena por alguien o por ti mismo',
    soloPhrases: {
        global: ['siente mucha vergüenza', 'se tapa la cara de la pena', 'hace una mueca de incomodidad']
    },
    togetherPhrases: {
        global: ['siente vergüenza ajena por', 'mira con incomodidad a', 'se avergüenza por culpa de']
    }
});
