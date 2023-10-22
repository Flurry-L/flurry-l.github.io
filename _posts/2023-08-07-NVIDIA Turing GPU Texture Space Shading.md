---
layout: single
toc: true
show_date: true
title: NVIDIA Turing GPU Texture Space Shading
date: 2023-08-07
categories: Research
tags: 
published: true
---
本文是对 [Texture Space Shading given at the 2018 SIGGRAPH](https://youtu.be/Rpy0-q0TyB0) 的整理。
- 文章第一部分介绍了 decoupled shading 与传统的 forward shading、deferred shading 的区别
- 文章第二部分详细讲解了 dicoupled shading 的 pipline，包括了 turing gpu 中提升性能的一系列 features
- 文章第三部分简介了如何定义 texture space
- 文章第四部分是 texture space shading 的一些应用与优势

## Decoupled Shading?

forward shading 流程为：geometry -> visibility sampling（rasterization and z-testing） -> appearance sampling，也就是先计算哪些 fragment 需要着色，再 shading。

![](/assets/Pasted image 20230808020438.png)
deferred shading 分为两个 pass：Geometry Pass 中渲染场景的各种信息到 G-buffer 中，Lighting Pass 中使用 G-buffer 中的数据进行计算。

![](/assets/Pasted image 20230808020527.png)

两种做法中，均需要每 frame 对每个 pixel 都进行 shading。但一些信息更加低频（GI、light maps），可以 reuse previous frame；而 VR 中，双眼差距很小，也可以 reuse 另一只眼的 shade。

分离 visibility 和 texture，便可以按照不同速率更新两者了。

![](/assets/Pasted image 20230808020243.png)

## Pipline Overview

对于 screen 上的每个 pixel，我们需要找到对它有贡献的 texels（以 Bilinear texture fetch 为例）：

![](/assets/Pasted image 20230808020938.png)

将这样一次请求定义为一个 shade request，放进一个 queue 中，稍后处理。

### no duplicates

不同的 pixel 可能会产生同一个 request，直接放进 queue 中显然会重复，增大开销。所以给每个 texel group 增添一个 1 bit 的 Status Bit Surface 表示是否已经请求。这里用 8x8 tiles 的 texture footprint 表示 groups 的status bit，在存储上直接用 unit64。

### more efficiently

warp 是一组连续的线程，在 GPU 上并行执行相同的指令。对于该 warp，对应的 32 threads 如果用于并行计算下面的 32 pixels，会出现大量冲突的原子操作，因为相邻 pixel 大多会访问同一个 Status Bit Surface。这会降低并行效率。

![](/assets/Pasted image 20230808024554.png)

![](/assets/Pasted image 20230808024800.png)

为解决 atomic operation pressure，可以使用 warp-wide dedup 技术：同一个 warp 里在同一个 8x8 tile 中操作的 threads，将它们的计算结果 merge 到一起，只做一次原子操作去更新：

![](/assets/Pasted image 20230808025454.png)

![](/assets/Pasted image 20230808025632.png)

![](/assets/Pasted image 20230808025810.png)

### perform the shades

在 shading queue 中我们存储的是 UV 坐标一类的（也就是 texture space 上的坐标），那如何通过 UV 坐标，回到原始的 geometry？

![](/assets/Pasted image 20230808030411.png)

答案是生成 triangle id texture，找到原始 trinagle 里的几何信息，剩下的可以靠插值。

![](/assets/Pasted image 20230808030846.png)

这里还使用了 compute quads 来并行计算一个 group 的 shading。

![](/assets/Pasted image 20230808031506.png)

## Defining texture space

主要是要 unique，triangle 不能重叠。

![](/assets/Pasted image 20230808032749.png)

HTEX 被用来保持图元的边缘和角落的采样依然在边缘，相连的 patch 可以复用（不确定）。

![](/assets/Pasted image 20230808032109.png)

## Applications

### Flexible muti-rate shading

在 screen space shading 中，只允许离散的着色率（2x2，4x2 etc.），导致边缘不连续或锯齿。而 decoupled shading 中，可以通过 mipmap 技术，为多种 LOD 做 texture shading，基本实现连续的着色率变化。

### High visibility rate

deferred shading：在 deferred shading 中，MSAA 不好使，G-buffer 的内存开销也很大，特别是 visibility samples 复杂的时候。decoupled shading 只需要比较小的 v-bufffers ，且是一种稳定的算法，shading samples 与 visibility samples 无关。

motion blur/depth of field：计算时需要知道一连串的 viewpoints 看见的结果，开销会大很多倍。但如果使用 decoupled shading，只需要知道不同的 visibility 而复用 shading 就好了。

![](/assets/Pasted image 20230808130604.png)

![](/assets/Pasted image 20230808130921.png)

![](/assets/Pasted image 20230808131030.png)

### shading reuse

双眼问题：对于双眼都可以看见的区域，只需要 shading 一次。

temporal reuse：GI、light maps 变化频率比较低，只需要做到每 N frames shade 一次。

decals：生成一次贴花，接下来几 frame 直接贴上去，不用每 frame 都重复生成。

### Helper pixel inefficiency

当有许多小于 2x2 block 的三角形时，shaidng 时会请求同个 texel block 的信息。而在 turing TSS 中，前面已经说到了，会去掉重复的 shade request，只 shade 一次。
