import { animeMaker } from '#anime';

export default animeMaker({
    command: ['golpeteo', 'bonk'],
    api: 'bonk',
    description: 'Da un golpecito a alguien o a ti mismo',
    soloPhrases: {
        global: ['da un golpecito en la cabeza', 'se da un golpecito con la mano', 'se sonroja tras el golpecito']
    },
    togetherPhrases: {
        global: ['le da un golpecito en la cabeza a', 'le da un suave golpe a', 'le da un golpecito a']
    }
});
