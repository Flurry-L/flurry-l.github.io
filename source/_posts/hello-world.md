---
title: Hello World
---

## Intro

大部分预测，提供输入时，获得一个预测输出。但高斯过程提供完整的不确定度分布。

在考虑数据之前生成先验函数样本，加入数据后通过贝叶斯理论更新为后验样本

![prior-posterior-sample](../assets/241021/prior-posterior-sample.png)

GP 不是处理线性函数，而是处理一般的（通常是平滑的）函数。

## Controlling the GP

哪些函数可能被采样，由核函数控制。

核函数 $\mathcal{K}(x, x' \vert \tau)$ 评估两个输入 $x$ 和 $x'$ 的相似度，其中 $\tau$ 是超参数。

返回越大说明越相似。

数据集 $\mathcal{D}=\{(x_{i}, y_{i})\}_{i=0}^N$，假设 $\bar{y_{i}}=0$。

预测集 $\{x_{i}^{*}\}_{i=0}^{M}$。

真实函数 $f(x)$，噪声 $\epsilon_{i} \sim \mathcal{N}(0, \sigma_{\epsilon}^2)$，$y_i=f(x_i)+\epsilon_i$。

$K_{X, X}(i, j)=\mathcal{K}(x_i, x_j\vert \tau)$ 代表任意两个输入的内核相似性

同理可以定义 $K_{X, X^*}$、$K_{X^*, X}$、$K_{X^*, X^*}$

假设 $(y, f^*)^T$ 联合分布为 $(N+M)$ 维多元正态

$$
\begin{bmatrix} y \\ f^* \\ \end{bmatrix}  \sim \mathcal{N}\left(\begin{bmatrix} 0 \\ 0 \\ \end{bmatrix},\begin{bmatrix} \hat{K}_{X,X} & K_{X,X^*} \\ K_{X^*,X} & K_{X^*,X^*} \\ \end{bmatrix}\right)
$$

其中 $\hat{K}_{X, X}=K_{X, X}+\sigma^2_{\epsilon}$

$$f^{*}\vert X^{*}, D\sim \mathcal{N}(K_{X^{*}, X}\hat{K}^{-1}_{X, X}y,K_{X^{*},X^{*}}-K_{X^{*},X}\hat{K}_{X,X}^{-1}K_{X,X^{*}})$$

通过 $y$ 对 $f^{*}$ 进行切片，得到 $f^{*}$ 的条件分布 $p(f^{*} \vert y)$

