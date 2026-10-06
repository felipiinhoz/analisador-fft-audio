# Analisador de Senoide e FFT

Interface React/Vite para reproduzir o experimento MATLAB fornecido.

## Rodar

```bash
npm install
npm run dev
```

Abra a URL exibida pelo Vite.

## Build

```bash
npm run build
npm run preview
```

## Equivalência

O projeto gera:

- `NP = fa * T`
- `dt = 1 / fa`
- `x(t) = A * sin(2*pi*ff*t)`
- FFT do sinal com zero-padding interno para a transformada
- espectro unilateral de amplitude

A interface permite alterar A, ff, fa e T e recalcular os dois gráficos.
