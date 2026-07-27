---
title: The Cherno Cpp
pubDatetime: 2026-02-20T00:10:56+08:00
description: 观看 The Cherno C++ 系列视频时记录的笔记。
tags:
---

看视频时记录的笔记 + AI 辅助写作。

<!-- excerpt -->

## 编译与链接基础

### 头文件中的函数定义与链接错误

如果在 `.h` 文件中定义了函数，多个翻译单元 include 该头文件时会产生重复定义的链接错误。解决方式有三种：

- **`static`**：函数仅在当前翻译单元（`.obj`）中可见。
- **`inline`**：允许函数的相同定义出现在多个翻译单元中（仍须满足 ODR 的相关要求）；是否实际展开函数体由编译器优化决定。
- **仅在头文件中声明**，将定义放在 `.cpp` 文件中。

### 头文件保护

`#pragma once` 确保头文件在同一个翻译单元中只被 include 一次。传统做法是使用 `#ifndef` / `#define` / `#endif` 宏守卫。

### 静态链接与动态链接

静态链接会将库的代码直接嵌入可执行文件中，通常更快，因为编译器有更多优化空间。动态链接则在运行时加载 `.dll`（或 `.so`）。

以 GLFW 为例：`glfw3.lib` 是体积较大的静态链接库；`glfw3dll.lib` 是配合 `glfw3.dll` 使用的导入库（import library），其中记录了 DLL 中各函数和符号的位置，使编译器在编译时能完成链接。如果没有这个 `.lib`，就只能在运行时通过函数名手动加载（如 `LoadLibrary` / `GetProcAddress`）。

动态链接时需要将 `.dll` 放在与可执行文件相同的目录下（或系统路径中）。

**Visual Studio 配置方法：**

- C/C++ → General → Additional Include Directories → 加入 `include` 目录
- Linker → General → Additional Library Directories → 加入 `lib` 目录
- Linker → Input → Additional Dependencies → 加入 `xxx.lib`
- 项目设置 General 下可修改编译目标（exe / lib / dll）

### 预编译头文件

可以在 Visual Studio 中设置预编译头文件（Precompiled Header），将频繁使用但很少改动的头文件预先编译，加快后续编译速度。

## Visual Studio 调试技巧

Visual Studio 提供了丰富的调试手段。在 Debug 模式下，编译器会做一些额外的安全处理使调试更友好：未初始化的变量会被填充为 `0xCCCCCCCC`，字符串周围会放置越界提示标记（guard bytes）。

调试时可以右键代码并跳转到 **Disassembly**（反汇编视图），查看实际生成的机器码。

还可以使用整个程序的 **内存视图**（Memory View），直接观察内存内容。

此外，运行时可以打 **条件断点** 或设置 **回调**（Action / Tracepoint），不必每次都重新编译。

多线程调试可以使用 Debug → Windows → **Parallel Stacks** 查看各线程的调用栈。

## 变量、指针与引用

### 引用

引用在声明时必须立即初始化，且一旦绑定就不能更改引用的目标对象。引用本质上是目标变量的别名。

### const 关键字

`const` 在 C++ 中用途广泛，尤其在指针和类方法中有多种含义：

```cpp
const int MAX_AGE = 90;

const int* a = new int;   // 指向的内容不可修改（const 在 * 左侧）
// 等价于 int const* a
*a = 2;                    // 错误
a = (int*)&MAX_AGE;        // 可以修改指向的地址

int* const b = new int;    // 指向的地址不可修改，但内容可修改
```

在类方法中，参数列表后的 `const` 表示该方法不会修改任何成员变量（除了 `mutable` 修饰的变量）：

```cpp
class Entity {
private:
    int m_X, m_Y;
    mutable int var;
public:
    int GetX() const {  // 承诺不修改类成员
        var = 2;        // mutable 成员例外
        return m_X;
    }
};
```

当函数参数为 `const Entity& e` 时，函数体内只能调用 `e` 的 `const` 方法。这在传引用避免拷贝的同时保证了对象不被修改。

### mutable 的另一种用法

在 lambda 中，如果按值捕获了变量，默认不能修改捕获的副本。加上 `mutable` 关键字后可以在 lambda 内部修改该副本，但不影响外部原始变量。

## static 关键字

`static` 在不同上下文中含义不同：

**类/结构体外部**：修饰的符号在链接阶段仅对当前翻译单元可见，其他编译单元即使使用 `extern` 也找不到。应尽量将不需要跨编译单元访问的全局函数和变量声明为 `static`。

**类/结构体内部**：静态成员变量由该类的所有实例共享，静态方法没有 `this` 指针，因此无法访问非静态成员。静态方法可以在没有类实例的情况下通过 `ClassName::Method()` 调用。传统的非 `inline` 静态数据成员在被使用时通常需要在类外提供定义；C++17 起也可以使用 `inline static` 直接在类内定义：

```cpp
struct Entity {
    static int x, y;
    inline static int z = 0;  // C++17：无需类外定义
    void Print() {
        std::cout << x << ", " << y << std::endl;
    }
};

int Entity::x;  // 非 inline 静态数据成员的类外定义
int Entity::y;

int main() {
    Entity e;
    e.x = 2; e.y = 3;
    // 也可以写成 Entity::x = 2; Entity::y = 3;
}
```

**局部作用域中的 static**：变量的作用域仍然是局部的，但生命周期延长为整个程序运行期间。这在单例模式等场景中非常有用：

```cpp
class Singleton {
public:
    static Singleton& Get() {
        static Singleton instance;  // 局部 static，只构造一次
        return instance;
    }
    void Hello() {}
};
```

## 类与面向对象

### class 与 struct

`class` 的成员默认访问权限是 `private`，而 `struct` 默认是 `public`。习惯上，`struct` 用于表示简单的数据集合（POD 风格），不在其中实现复杂的逻辑或完整的类层次结构。

### 访问控制

- **`private`**：只有类内部和友元可以访问，`public` 派生类也不行。
- **`protected`**：类内部和派生类可以访问。

访问控制的目的是向使用者传达意图：应当通过 `public` 接口操作对象，而不是直接修改 `private` 成员。

### 构造函数相关

**删除构造函数**：使用 `= delete` 阻止实例化，适用于只提供静态方法的工具类：

```cpp
class Log {
public:
    Log() = delete;
    static void Write() {}
};

int main() {
    Log::Write();  // 正常调用
    // Log l;      // 编译错误，构造函数被删除
}
```

**成员初始化列表**：在构造函数体中赋值成员时，成员会先被默认构造，再被覆盖赋值。使用初始化列表 `: m_data(data)` 则直接调用对应构造函数，避免了多余的默认构造开销。

### 继承

```cpp
class Player : public Entity {};
```

### 虚函数与动态派发

如果基类指针指向派生类对象，调用非虚函数时只会调用基类版本。使用 `virtual` 关键字启用动态派发，运行时根据实际类型调用正确的函数：

```cpp
class Entity {
public:
    virtual std::string GetName() { return "Entity"; }
};

class Player : public Entity {
private:
    std::string m_Name;
public:
    Player(const std::string& name) : m_Name(name) {}
    std::string GetName() override { return m_Name; }
    // override 关键字非必须，但可以提高可读性并防止拼写错误
};

int main() {
    Player* p = new Player("player");
    Entity* e = p;
    std::cout << e->GetName() << std::endl;  // 输出 "player"（有 virtual 时）
}
```

虚函数通过 **vtable**（虚函数表）实现动态派发，代价是需要额外的内存存储虚函数表指针，以及每次调用时需要通过虚函数表查找目标函数。

### 纯虚函数（接口）

纯虚函数使基类无法被实例化，强制派生类提供实现：

```cpp
class Printable {
public:
    virtual std::string GetClassName() = 0;
};

class Entity : public Printable {
public:
    std::string GetClassName() override { return "Entity"; }
};

class Player : public Entity {
public:
    std::string GetClassName() override { return "Player"; }
};

void Print(Printable* obj) {
    std::cout << obj->GetClassName() << std::endl;
}

int main() {
    Player* p = new Player();
    Entity* e = p;
    Print(e);  // 输出 "Player"
}
```

### 虚析构函数

当通过基类指针 `delete` 派生类对象时，如果析构函数不是 `virtual` 的，只会调用基类的析构函数，导致派生类的资源泄漏：

```cpp
Base* poly = new Derived;
delete poly;
// 没有 virtual：Base 构造 → Derived 构造 → Base 析构（Derived 析构被跳过！）
// 有 virtual：  Base 构造 → Derived 构造 → Derived 析构 → Base 析构
```

只要类中有虚函数，就应当将析构函数也声明为 `virtual`。

## 枚举

`enum` 本身不构成命名空间，但定义在类内部时可以通过类名访问：

```cpp
class Log {
public:
    enum Level {
        LevelError = 0, LevelWarning, LevelInfo
    };
    void SetLevel(Level level);
    void Error(const char* message);
};

int main() {
    Log log;
    log.SetLevel(Log::LevelError);
}
```

## 运算符重载

```cpp
struct Vec2 {
    int X, Y;
    Vec2 operator+(const Vec2& other) const {
        return Vec2(X + other.X, Y + other.Y);
    }
    bool operator==(const Vec2& other) const {
        return X == other.X && Y == other.Y;
    }
};

std::ostream& operator<<(std::ostream& stream, const Vec2& other) {
    stream << other.X << ", " << other.Y;
    return stream;
}
```

自定义智能指针也常重载 `->` 运算符：

```cpp
Entity* operator->() {
    return m_Obj;
}
```


## 隐式转换与 explicit

C++ 允许编译器进行一次隐式类型转换来匹配函数参数或赋值目标：

```cpp
Entity a = "cherno";  // const char* → std::string → Entity，需要两次转换，会报错
// 但如果 Entity 有接受 const char* 的构造函数则只需要一次，可以通过

void PrintEntity(const Entity& entity);
PrintEntity("cherno");              // 错误：const char* 到 Entity 需要两次转换
PrintEntity(std::string("cherno")); // 正确：一次隐式转换
PrintEntity(Entity("cherno"));      // 正确：显式构造
```

在构造函数前加 `explicit` 关键字可以禁止隐式转换，防止意外的类型转换。实际使用频率不高，但在需要严格控制时很有价值。


## 内存管理

### 栈与堆

每个线程的栈大小取决于操作系统、链接器和运行时配置，并不存在通用的 2 MB 结论。栈上的自动存储期对象通常随作用域结束而销毁，分配开销很小；通过 `new` 创建的对象具有动态存储期，需要由程序显式管理，或交给智能指针管理。两者的性能差异不仅来自分配方式，也会受到对象布局和缓存局部性等因素影响。

### new 与 malloc

`new` 不仅分配内存，还会调用构造函数；`malloc` 只分配原始内存。**Placement new** 可以在已分配好的内存上调用构造函数：`new(ptr) Entity()`。

### 智能指针

```cpp
// 自定义的作用域指针
class ScopedPtr {
private:
    Entity* m_Ptr;
public:
    ScopedPtr(Entity* ptr) : m_Ptr(ptr) {}
    ~ScopedPtr() { delete m_Ptr; }
};

int main() {
    {
        ScopedPtr p(new Entity);  // 离开作用域自动 delete
    }

    {
        std::shared_ptr<Entity> e0;
        {
            std::unique_ptr<Entity> entity = std::make_unique<Entity>();
            std::shared_ptr<Entity> sharedEntity = std::make_shared<Entity>();
            e0 = sharedEntity;
        }
        // sharedEntity 离开作用域，但 e0 仍持有引用，引用计数不为零
    }
    // e0 离开作用域，引用计数归零，自动销毁
    // weak_ptr 不会增加引用计数
}
```


## 拷贝与移动语义

### 拷贝构造函数

C++ 默认生成的拷贝操作会逐个拷贝基类和非静态数据成员。对于原始指针成员，这只会复制指针值，并不会复制其指向的资源；如果对象需要独立拥有该资源，就应自定义拷贝操作或改用合适的 RAII 类型：

```cpp
ClassName(const ClassName& other) { /* 深拷贝逻辑 */ }
```

### 右值引用与移动语义

左值（lvalue）是有持久身份的表达式，右值（rvalue）是临时值。不能将右值绑定到左值引用（`int& a = 10;` 是错误的），但可以绑定到 `const` 左值引用（`const int& a = 10;`），编译器会创建一个临时变量。因此 `const T&` 可以同时接受左值和右值。

右值引用（`T&&`）专门用于绑定右值，知道对象是临时的，就可以安全地"偷取"其资源：

```cpp
void PrintName(std::string&& name) {
    std::cout << name << std::endl;
}
```

对于已有的左值，可以使用 `std::move` 将其转换为右值引用，从而触发移动构造或移动赋值。移动构造函数和移动赋值运算符通常需要手动编写，核心逻辑是：将右值的资源指针接管过来，然后将右值的指针置空，避免双重释放。


## 字符串

### 字符串字面值

字符串字面值不能被修改；指向它时应使用 `const char*`。如果需要修改，应使用局部字符数组：

```cpp
const char* name = "cherno";  // 指向字符串字面值
// name[3] = 'a';              // 编译错误

char name[] = "cherno";       // 可修改的局部数组
name[3] = 'a';                 // 安全
```

C++14 引入了字符串字面值后缀和原始字符串字面值：

```cpp
using namespace std::string_literals;
std::string name0 = u8"Cherno"s + " hello";

const char* example = R"(Line1
Line2
Line3)";
```

### std::string_view（C++17）

`std::string_view` 是对已有字符串的非拥有视图，可以大大减少不必要的内存分配和拷贝。

### Small String Optimization（SSO）

在 MSVC 中，长度小于等于 15 个字符的字符串不会在堆上分配内存，而是直接存储在 `std::string` 对象内部的缓冲区中。


## 容器

### std::array

`std::array<int, 5> a;` 是大小固定的数组，元素直接存储在 `std::array` 对象内部；它位于何处取决于该对象本身的存储位置。`operator[]` 不进行边界检查，需要检查时应使用 `.at()`。

### std::vector

`std::vector` 的底层数据存储在堆上。拷贝构造的开销较大，主要来自两方面：将临时对象拷贝进 vector，以及扩容时的整体拷贝。优化方式是使用 `reserve` 预留空间，并使用 `emplace_back` 原地构造元素，避免不必要的拷贝和移动。


## 模板

模板在编译时根据使用的类型生成具体代码，本质上是编译期的代码生成工具：

```cpp
template<typename T>
void Print(T value) {
    std::cout << value << std::endl;
}

Print(5);        // 自动推导为 int
Print("Hello");  // 自动推导为 const char*

template<typename T, int N>
class Array {
private:
    T m_Array[N];
public:
    int GetSize() const { return N; }
};

Array<std::string, 50> array;
```

模板非常适合日志系统、材质系统等需要泛型的场景。


## 类型转换与 RTTI

C++ 提供了多种类型转换方式，其中 `dynamic_cast` 专门用于沿继承层次进行安全的向下转型。它依赖 RTTI（运行时类型信息），转换失败时返回 `nullptr`（指针）或抛出异常（引用）：

```cpp
class Entity {
public:
    virtual void PrintName() {}  // 必须有虚函数才能使用 dynamic_cast
};
class Player : public Entity {};
class Enemy : public Entity {};

int main() {
    Player* player = new Player();
    Entity* actuallyPlayer = player;
    Entity* actuallyEnemy = new Enemy();

    Player* p1 = dynamic_cast<Player*>(actuallyEnemy);   // 失败，返回 nullptr
    Player* p2 = dynamic_cast<Player*>(actuallyPlayer);   // 成功
}
```

`dynamic_cast` 有运行时的时间和存储开销，因为需要存储和查询 RTTI 信息。


## C++17 实用特性

### 结构化绑定（Structured Bindings）

```cpp
std::tuple<std::string, int> CreatePerson() {
    return { "Cherno", 24 };
}

int main() {
    auto [name, age] = CreatePerson();
}
```

### std::optional

表示一个值可能存在也可能不存在，避免使用特殊值或指针来表达"无"：`std::optional<std::string>`。

### std::variant

类型安全的联合体，一个变量可以持有多种类型中的某一种：

```cpp
std::variant<std::string, int> data;
data = "Cherno";
std::cout << std::get<std::string>(data) << "\n";
// 类型不匹配时 std::get 会抛出异常
// 安全写法：if (auto value = std::get_if<std::string>(&data)) { ... }
```

### std::any

可以存储任意类型的值，但对于大类型会动态分配内存，性能不如 `std::variant`。


## 多返回值

C++ 中实现多返回值有多种方式：使用 `struct` 封装，通过引用参数输出，使用 `std::tuple`（配合 `std::get<0>(tuple)` 访问），或使用 `std::pair`（通过 `.first` 和 `.second` 访问）。C++17 的结构化绑定让 tuple 和 pair 的使用更加简洁。


## 宏

宏可以根据编译配置产生不同行为，在日志系统中尤其常用。例如在 Release 模式下可以将日志宏定义为空操作：

```cpp
#if DEBUG == 1
#define LOG(x) std::cout << x << std::endl
#else
#define LOG(x)
#endif
```


## 多线程

C++ 提供了 `std::async`、`std::future`、`std::mutex` 等多线程原语。Visual Studio 中可以通过 Debug → Windows → Parallel Stacks 可视化各线程的调用栈。


## 性能测试与可视化

可以使用 RAII 风格的 Timer 类来进行性能测试：构造时记录起始时间，析构时计算耗时。需要注意在 Release 和 Debug 模式下性能表现可能完全不同，应以 Release 模式为准。

可视化基准测试可以输出 Chrome Tracing 格式的 JSON 文件，在浏览器中打开 `chrome://tracing` 进行可视化，支持多线程时序图。


## 设计模式：单例

单例模式本质上是对全局变量和静态函数的一种组织方式。实现要点：将构造函数设为 `private`、删除拷贝构造函数、在 `private` 中持有一个静态实例，并通过静态方法暴露访问入口。适用于引擎、管理器等只需要一个实例的场景。
