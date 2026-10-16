import { animeMaker } from '#anime';

export default animeMaker({
    command: ['verano', 'parejaverano'],
    api: 'snuggle',
    description: 'Muestra cariño de pareja de verano con alguien',
    soloPhrases: {
        global: ['suspira pensando en su pareja de verano', 'sonríe con el corazón derretido', 'se acurruca con ilusión']
    },
    togetherPhrases: {
        global: ['se acurruca con', 'le da cariño de verano a', 'se pega con ternura a']
    }
});
