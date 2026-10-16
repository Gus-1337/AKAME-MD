import { animeMaker } from '#anime';

export default animeMaker({
    command: ['timido', 'shy'],
    api: 'shy',
    description: 'Está tímido solo o por alguien',
    soloPhrases: {
        global: ['está tímido', 'se sonroja', 'baja la mirada', 'se pone nervioso']
    },
    togetherPhrases: {
        global: ['se pone tímido con', 'se sonroja por', 'baja la mirada al ver a', 'se esconde detrás de']
    }
});
