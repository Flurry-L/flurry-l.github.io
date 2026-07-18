---
title: 关于重要性采样的误解
date: 2025-02-04T17:45:14+08:00
math: true
tags:
    - render
    - math
---

在 ReSTIR 中，重要性采样（Importance Sampling, IS）的公式表述为：

$$
I = \int_\Omega f(x) dx = \frac{1}{N}\sum_{i=1}^N \frac{f(x_i)}{p(x_i)}
$$

概统知识所剩无几的我在细看此式后，一个直觉性困惑浮现：为何分母$p(x_i)$越大时，样本贡献反而越小？

<!-- excerpt -->

出现误解根源在于，我混淆了目标分布与采样分布。

不妨将积分重构为期望形式，令$f(x) = g(x) \cdot p_g(x)$，则原积分转化为：

$$
\int_\Omega f(x) dx = \mathbb{E}_{p_g}[g(x)]
$$

此时，目标分布 $p_g(x)$ 为待求解的期望的量所对应的真实分布，而采样分布 $p(x)$ 为实际用于生成样本的概率分布。

若直接按 $p(x)$ 采样，会引入偏差：
- 过采样区域（$p(x) \gg p_g(x)$）：样本数量过多，导致高估
- 欠采样区域（$p(x) \ll p_g(x)$）：样本不足，导致低估

所以需要除以采样分布，调整权重。

无论 $p(x)$ 是什么，调整后期望均无偏：

$$
\mathbb{E}_{p}\left[\frac{p_g(x)g(x)}{p(x)}\right] = \int_\Omega \frac{p_g(x)}{p(x)}g(x) \cdot p(x)dx = \mathbb{E}_{p_g}[g(x)]
$$

而估计量的方差为：

$$
\text{Var}\left(\frac{p_g(x)g(x)}{p(x)}\right) = \mathbb{E}_{p}\left[\left(\frac{p_g(x)g(x)}{p(x)}\right)^2\right] - \left(\mathbb{E}_{p_g}[g(x)]\right)^2
$$

当采样分布与目标分布形状匹配时，方差达到最小。这也是为什么在 ReSTIR 中需要迭代优化采样分布。
