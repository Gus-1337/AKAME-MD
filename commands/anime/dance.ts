import { animeMaker } from '#anime';

export default animeMaker({
    command: ['bailar', 'dance'],
    api: 'dance',
    description: 'Baila solo o con alguien',
    soloPhrases: {
        global: ['baila con alegría', 'se mueve al ritmo', 'danza sin parar', 'baila como si nadie mirara']
    },
    togetherPhrases: {
        global: ['baila con', 'comparte baile con', 'danza junto a', 'baila apasionadamente con']
    }
});
