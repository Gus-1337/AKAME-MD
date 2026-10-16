import { animeMaker } from '#anime';

export default animeMaker({
    command: ['palmadita', 'pat'],
    api: 'pat',
    description: 'Acaricia a alguien o a sí mismo',
    soloPhrases: {
        global: ['se acaricia', 'se da una palmada', 'se toca suavemente', 'se da cariño']
    },
    togetherPhrases: {
        global: ['acaricia a', 'da una palmada a', 'toca suavemente a', 'da cariño a']
    }
});
