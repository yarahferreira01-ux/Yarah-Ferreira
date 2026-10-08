# Encontro — motion design interativo

Motion design feito a partir da foto do casal diante do vitral. A composição foi criada com
[HyperFrames](https://hyperframes.heygen.com) (HTML + GSAP, renderiza em MP4), e um servidor
Node.js entrega a versão interativa.

## Rodar

```bash
npm install
npm start            # player interativo em http://localhost:3000
npm run studio       # abre a composição no HyperFrames Studio
npm run check        # lint + validação do HyperFrames
npm run render       # gera renders/encontro.mp4 (1080x1920, 15s)
```

O vídeo já renderizado está em `video/encontro.mp4`.

## O que acontece no vídeo (15s, vertical)

| Tempo | Cena |
| --- | --- |
| 0 – 3s | A janela acende: os vidros vermelhos do vitral se iluminam um a um e os raios de luz entram |
| 3 – 5s | A câmera desce até o pé levantado dela; um brilho passa pelo piso de madeira |
| 5 – 7.6s | A câmera sobe pelos corpos até os rostos; dois rastros de luz partem (um dourado, do passo dela, e um rubi, do vitral) |
| 7.6 – 9.8s | **O encontro**: os rastros se cruzam entre os olhares, a luz explode em ondas e faíscas e um coração de luz se desenha em volta dos rostos |
| 9.8 – 12.4s | A câmera abre para o cenário inteiro; brilhos na aliança, nas mãos, no relógio e no salto; partículas sobem do chão |
| 12.4 – 15s | A luz do vitral toma a cena, entram as faixas de cinema e a imagem escurece para recomeçar o loop |

A profundidade é real: o casal foi recortado com `hyperframes remove-background`
(`assets/casal.webp`) e o cenário ficou num plano separado (`assets/cenario.jpg`). Cada plano
anda em uma velocidade diferente (parallax).

## Interações (player)

- **Mover o mouse** (ou inclinar o celular): os planos se deslocam em profundidade, e uma luz segue o ponteiro
- **Clicar/tocar**: solta uma onda de luz com faíscas
- **Tocar nos rostos**: volta para o encontro (a onda fica rosada e maior)
- **Tocar nas mãos dadas**: brilhos na aliança, nas mãos e no relógio
- **Tocar no pé levantado**: volta para a cena do passo
- **Tocar no vitral**: os vidros vermelhos ganham mais luz
- **Segurar**: câmera lenta enquanto o dedo estiver na tela
- **Barra de tempo**: arrastar para navegar; os pontos marcam os capítulos (o ponto rosa é o encontro)
- **Teclado**: `espaço` pausa, `←/→` voltam/avançam, `1–6` pulam de capítulo, `E` vai para o encontro

## Estrutura

```
index.html          composição HyperFrames (timeline GSAP determinística)
server.js           servidor Node.js sem dependências
player/             página interativa (iframe + controles + interações)
assets/             cenário, recorte do casal, GSAP local
video/encontro.mp4  render final
```
