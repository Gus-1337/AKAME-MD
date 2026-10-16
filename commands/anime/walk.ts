import { animeMaker } from '#anime';

export default animeMaker({
    command: ['caminar', 'walk'],
    api: 'walk',
    description: 'Camina solo o con alguien',
    soloPhrases: {
        global: ['camina', 'pasea', 'da un paseo', 'camina sin rumbo']
    },
    togetherPhrases: {
        global: ['camina con', 'pasea junto a', 'da un paseo con', 'camina de la mano de']
    }
});
