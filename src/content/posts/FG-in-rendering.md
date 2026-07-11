---
title: 基于渲染的帧生成
date: 2024-12-16T11:35:41+08:00
tags: 
  - render
  - research
---

只有自己才看得懂的帧生成相关工作总结。

<!-- excerpt -->

## 帧插值（Interpolation）

### 传统插值方法

使用运动矢量（MV）与深度图进行简单的插帧，预测中间帧，但遮挡区域通常表现不佳

**论文**  

- Yang et al., "Image-based bidirectional scene reprojection," 2011;  

  > 这篇讲了基于场景几何、图像的两种插帧方式。
  >
  > 场景辅助：在 t 时间计算每个顶点在 t 和 t-1 时的世界坐标，使得像素 p 能访问到该顶点 t-1 时的世界坐标、如果可见则复用颜色。
  >
  > 图像：运用光流/运动向量，双向预测，进行融合

- Lee et al., "Iterative depth warping," 2018.

  > deferred rendering 下、基于 backward warping 预测深度缓冲区
  >
  > mipmap、主成分分析
  >
  > 多层深度，填补空洞

### 结合神经网络  

基于光流的神经网络插帧

**论文**

- Briedis et al., "Neural frame interpolation for rendered content," 2021.

  > **神经网络光流，且比渲染器提供的准确 MV 效果更好。一次训练，生成时直接推理**
  >
  > 内插，用到了待生成帧的 g-buffer
  >
  > w-map 用于处理遮挡
  >
  > 光流估计：颜色+辅助特征缓冲区 -> 金字塔 -> 直接预测目标帧光流
  >
  > 运动补偿：训练通用神经网络 w-map，根据输入帧的特征，决定了该像素 warp 后对生成帧的贡献
  >
  > 帧合成：2(前向映射+At) -> GridNet ->重建中间帧
  >
  > **能解决遮挡（明显进步），但不能解决 shading 的移动**

## 帧外推（Extrapolation）

### 传统外推方法

基于运动视差的帧外推，使用光流和像素变形，在前向时间步上预测未来帧，但遮挡区域和复杂光照变化处理表现有限

**论文** 

- Mark et al., "Post-rendering 3D warping," 1997.

  > 真不行

### 现代 

#### 使用目标帧 G-buffer

有了 MV，故使用 warp 进行渲染结果复用

warp 带来的问题：hole、shading、视觉质量

hole：

- 用深度、法线等标注空洞（ExtraNet）

- OMV warp + backward warp + g-buffer -> 填色网络（ExtraNet）

- g-buffer guided warping（ExtraSS）

shading：

- demodulate albedo，再 modulate 生成帧的 albedo（ExtraNet）

- history encoder 捕捉着色变化（代替光流）（ExtraNet）  

- 轻量光流预测 FRNet，只修补 g-buffer 相似且 shading 误差大的地方（ExtraSS）

直接改进 MV：

- 非常全的多级循环神经网络（LMV），把 shading 也给学到了

**论文**

- Guo et al., "ExtraNet: Real-time extrapolated rendering for low-latency temporal supersampling," 2021;  

  > 时间重建+纹理修补
  >
  > 挑战：
  >
  > 1. 遮挡（OMV、Lhole）
  >
  > 2. 着色变化（history encoder、Lshade、demodulation-modulation）
  >
  > i、i-1、i-2（历史编码器捕捉阴影高光等），预测 i + 0.5
  >
  > demodulation-> OMV warp -> 填色网络 -> (i + 0.5) g-buffer modulation
  >
  > 填色网络类似于 U-Net，多尺度特征被有效利用。还加入了 history encoder（shading 信息）
  >
  > Lhole 和 Lshade，为空洞和着色变化区域的损失增强

- Wu et al., "ExtraSS: A Framework for Joint Spatial Super Sampling and Frame Extrapolation," 2023.

  > g-buffer guided warping：选出 warp 回去后 g-buffer 最相似的几个点，归一化权重后加权平均（记作 $f_g^t(i_{t-1})[x]$）（解决 disoccluded 区域鬼影现象）
  >
  > Flow-based Refinement network (FRNet)：$\bar{i_t^-}=FRNet(f_g^t(i_{t-1}^-),f_g^t(i_{t-3}^-),r_t^-)$，输出 shading 修复图。FRNet 的输出，与原来的预测帧合成，修复 shading
  >
  > ESS 和 SS 帧使用不同的编码器进行超采样，损失函数为：
  >
  > $$
  > L_s =
  > \left\lVert \bar{I}_t - I_t^{\mathrm{gt}} \right\rVert_1
  > + \lambda_{\mathrm{occ}} L_{\mathrm{occ}}
  > + \lambda_{\mathrm{vgg}} L_{\mathrm{vgg}},
  > \quad
  > \lambda_{\mathrm{occ}} = 1,\;
  > \lambda_{\mathrm{vgg}} = 0.01
  > $$
  >
  > $$
  > L_t =
  > \left\lVert \bar{I}_t - f_r(\bar{I}_{t-1}) \right\rVert_1
  > + \sum_{k=1}^{4}
  > \ell_1(\bar{\Phi}_t^k, \Phi_t^k)
  > $$

- Wu et al., "Adaptive Recurrent Frame Prediction with Learnable Motion Vectors," 2023

  > Our framework supports the prediction of transparency, particles, and texture animations, with improved motion vectors that capture shading, reflections, and occlusions, in addition to geometry movements.
  >
  > U-Net + 金字塔，很多特征循环输入，scene space motion 和 image space flow（特征提取） 一起上，非常全……
  >
  > $I^{i+\epsilon}=\vec{v_{\theta}}^{i+\epsilon}\odot I^{i+(\epsilon-1)}+I_{\theta}(S^{i+\epsilon}),S^i=S_\theta(\vec{v_\theta}(\vec{v_r},S^{i-1},g^{i-1},I^{i-1})\odot f^{i-1},g^i)$



#### 不使用目标帧 G-buffer

想办法在生成帧复用渲染结果 -> 运动假设

- 图像运动假设：例如 Mob-FGSR，假设像素在渲染帧上是二次运动

- 空间运动假设：GFFE

论文：

- Wu et al., "GFFE: G-buffer Free Frame Extrapolation for Low-latency Real-time Rendering," 2024

  > 不使用外推帧的 g-buffer
  >
  > GAE：像素 x 反投影回世界坐标 p，投影到上一帧上的 $\hat{x}$，用 2d 运动向量将 x 移动到上一帧的 $x'$，$\left\lVert \hat{x} - x' \right\rVert_2$ 小于阈值时视为静态（$M_t^{dyn}[x]=0, P_i[x]=p$），否则动态（$M_t^{dyn}[x]=1,P_i[x]=P'_{i-1}[x'],P_0[x]=p$）。假设线性运动，将上一帧的片段移动后，投影到生成帧。用分层背景收集填充 disoccluded 区域
  >
  > 自适应渲染窗口：使用相机姿态估计
  >
  > SCN：t 时刻 + GAE 预测的、t-1 用 warp 预测的、depth、M_input。输出 shading 精细化帧（shading 好，但整体被模糊了，几何不够锐利）和 focus mask
  >
  > GAE 负责精细几何，SCN 负责 shading 修复


## 商用技术与硬件加速

### DLSS3

[Introducing NVIDIA DLSS 3 | GeForce News | NVIDIA](https://www.nvidia.com/en-us/geforce/news/dlss3-ai-powered-neural-graphics-innovations/)

神经网络计算：Tensor core（专门用于做矩阵乘），和 cuda core 是独立硬件

NVIDIA Optical Flow Accelerator（OFA）：NVIDIA 自 Turing 架构起提供的光流专用硬件单元；具体实现算法并未公开

NVIDIA Reflex：降低内插的延迟

### FSR3

[FidelityFX Super Resolution 3.1.2 (FSR3) - Upscaling and Frame Generation - FidelityFX SDK - AMD GPUOpen](https://gpuopen.com/manuals/fidelityfx_sdk/fidelityfx_sdk-page_techniques_super-resolution-interpolation/#add-upscaling-through-fsr3-interface)

研究与工业的差距：很大一部分在处理 frame pacing，更关注质量稳定、过渡丝滑
