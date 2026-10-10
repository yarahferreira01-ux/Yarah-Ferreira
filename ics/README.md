# ICS Soluções Comerciais — motion design interativo

Versão animada da marca ICS. A composição foi feita com
[HyperFrames](https://hyperframes.heygen.com) (HTML + GSAP, renderiza em MP4), e um servidor
Node.js entrega a versão interativa.

## Rodar

```bash
cd ics
npm install
npm start            # player interativo em http://localhost:3000
npm run studio       # abre a composição no HyperFrames Studio
npm run check        # lint + validação do HyperFrames
npm run render       # gera renders/ics.mp4 (1920x1080, 12s, 30fps)
```

O vídeo já renderizado está em `video/ics.mp4`.

## O que acontece no vídeo (12s, horizontal)

| Tempo | Cena |
| --- | --- |
| 0 – 2.4s | **Crescimento**: uma linha dourada de gráfico sobe pela tela, com nós e rótulos (+12%, +38%, +74%) |
| 2.4 – 4s | A ponta do gráfico vira um cometa, voa até o centro e **vira a seta da marca** (flash, ondas e faíscas); os três blocos chegam de direções diferentes e se encaixam |
| 4 – 5.4s | O ícone desliza para a posição do logo e o divisor se desenha, com um brilho correndo por ele |
| 4.9 – 7.3s | **ICS**: as letras sobem da máscara, saindo do desfoque, e se aproximam; um brilho dourado atravessa o nome |
| 6.4 – 7.8s | O traço se estende e **SOLUÇÕES COMERCIAIS** entra letra a letra |
| 8 – 10.4s | Momento da marca: um feixe de luz cruza o logo, reflexos passam pelos blocos, a seta brilha e ondas douradas saem do ícone |
| 10.4 – 12s | A seta "respira" para cima e a cena escurece para recomeçar o loop |

Cores e proporções seguem a imagem original: azul-marinho `#0b1b33`, dourado `#c9a54e`,
dourado claro `#e9c97b` na seta e creme `#f4efe4` no nome. As fontes (Cormorant Garamond e
Montserrat) ficam em `assets/fonts`, então o render não depende de internet.

## Interações (player)

- **Mover o mouse** (ou inclinar o celular): fundo, ícone, texto e efeitos se inclinam em 3D, cada camada numa profundidade, e uma luz dourada segue o ponteiro
- **Passar sobre os blocos**: o bloco acende
- **Tocar num bloco**: ele gira em 3D e solta faíscas
- **Tocar na seta**: a seta dispara para o alto com um rastro de faíscas e um contador de crescimento sobe (+N%, somando a cada toque)
- **Tocar em "ICS"**: as letras giram em sequência e um brilho dourado atravessa o nome
- **Tocar em "Soluções Comerciais"**: uma onda de luz corre pelas letras
- **Tocar em qualquer outro lugar**: onda de luz com faíscas
- **Segurar**: câmera lenta enquanto o dedo estiver na tela
- **Barra de tempo**: arrastar para navegar; os pontos marcam os capítulos (o ponto dourado é o momento da marca)
- **Teclado**: `espaço` pausa, `←/→` voltam/avançam, `1–6` pulam de capítulo, `M` vai para o momento da marca

## Estrutura

```
index.html          composição HyperFrames (timeline GSAP determinística)
server.js           servidor Node.js sem dependências
player/             página interativa (iframe + controles + interações)
assets/             fontes e GSAP locais
video/ics.mp4       render final
```
