import { animeMaker } from '#anime';

export default animeMaker({
    command: ['comer', 'eat'],
    api: 'eat',
    description: 'Come solo o con alguien',
    soloPhrases: {
        global: ['come con gusto', 'disfruta de su comida', 'saborea cada bocado', 'come tranquilamente']
    },
    togetherPhrases: {
        global: ['come con', 'comparte comida con', 'invita a comer a', 'disfruta de una comida con']
    }
});
