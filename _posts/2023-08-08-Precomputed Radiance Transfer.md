---
layout: single
toc: true
show_date: true
title: Precomputed Radiance Transfer
date: 2023-08-08
categories: Research
tags: 
published: false
---

PRT 计算来自环境光的阴影。

对于 rendering equation：
$$
L(o) = \int_{\Omega} L(i)V(i)\rho(i, o)max(0, n\cdot i)di
$$
将 $L(i)$ 作为 lighting，$V(i)\rho(i, o)max(0, n\cdot i)$ 作为 light transport 项分别用球谐函数展开：
$$
L(o) \approx \sum l_i \int_{\Omega} B_i(i)V(i)\rho(i, o)max(0, n\cdot i)di
$$
对于 diffuse 情况，brdf 几乎是常数：
$$
\begin{align*}
L(o) &\approx \rho \sum l_i \int_{\Omega} B_i(i)V(i)max(0, n\cdot i)di \\
&\approx \rho \sum l_i T_i
\end{align*}
$$
只要 precompute $T_i$，渲染时只需要计算向量乘法。

注意：
1. visibility 做了预计算，故物体需要静止
2. light 投影到 SH 上，但由于 SH 的旋转不变性，仍然能直接计算

