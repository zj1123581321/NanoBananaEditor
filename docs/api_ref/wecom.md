消息推送配置说明

最后更新：2025/08/07

目录

- [如何使用消息推送](https://developer.work.weixin.qq.com/document/path/99110#%E5%A6%82%E4%BD%95%E4%BD%BF%E7%94%A8%E6%B6%88%E6%81%AF%E6%8E%A8%E9%80%81)
- [消息类型及数据格式](https://developer.work.weixin.qq.com/document/path/99110#%E6%B6%88%E6%81%AF%E7%B1%BB%E5%9E%8B%E5%8F%8A%E6%95%B0%E6%8D%AE%E6%A0%BC%E5%BC%8F)
-       [文本类型](https://developer.work.weixin.qq.com/document/path/99110#%E6%96%87%E6%9C%AC%E7%B1%BB%E5%9E%8B)
-       [markdown类型](https://developer.work.weixin.qq.com/document/path/99110#markdown%E7%B1%BB%E5%9E%8B)
-       [markdown\_v2类型](https://developer.work.weixin.qq.com/document/path/99110#markdown-v2%E7%B1%BB%E5%9E%8B)
-       [图片类型](https://developer.work.weixin.qq.com/document/path/99110#%E5%9B%BE%E7%89%87%E7%B1%BB%E5%9E%8B)
-       [图文类型](https://developer.work.weixin.qq.com/document/path/99110#%E5%9B%BE%E6%96%87%E7%B1%BB%E5%9E%8B)
-       [文件类型](https://developer.work.weixin.qq.com/document/path/99110#%E6%96%87%E4%BB%B6%E7%B1%BB%E5%9E%8B)
-       [语音类型](https://developer.work.weixin.qq.com/document/path/99110#%E8%AF%AD%E9%9F%B3%E7%B1%BB%E5%9E%8B)
-       [模版卡片类型](https://developer.work.weixin.qq.com/document/path/99110#%E6%A8%A1%E7%89%88%E5%8D%A1%E7%89%87%E7%B1%BB%E5%9E%8B)
-             [文本通知模版卡片](https://developer.work.weixin.qq.com/document/path/99110#%E6%96%87%E6%9C%AC%E9%80%9A%E7%9F%A5%E6%A8%A1%E7%89%88%E5%8D%A1%E7%89%87)
-             [图文展示模版卡片](https://developer.work.weixin.qq.com/document/path/99110#%E5%9B%BE%E6%96%87%E5%B1%95%E7%A4%BA%E6%A8%A1%E7%89%88%E5%8D%A1%E7%89%87)
- [消息发送频率限制](https://developer.work.weixin.qq.com/document/path/99110#%E6%B6%88%E6%81%AF%E5%8F%91%E9%80%81%E9%A2%91%E7%8E%87%E9%99%90%E5%88%B6)
- [文件上传接口](https://developer.work.weixin.qq.com/document/path/99110#%E6%96%87%E4%BB%B6%E4%B8%8A%E4%BC%A0%E6%8E%A5%E5%8F%A3)

## [](https://developer.work.weixin.qq.com/document/path/99110#%E5%A6%82%E4%BD%95%E4%BD%BF%E7%94%A8%E6%B6%88%E6%81%AF%E6%8E%A8%E9%80%81)如何使用消息推送

- 创建者可以在 创建消息推送页面、创建完成页面、消息推送详情页面，看到该消息推送特有的webhookurl。开发者可以按以下说明向这个地址发起HTTP POST 请求，即可实现给该群组发送消息。下面举个简单的例子.  
    假设webhook是：https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=693a91f6-7xxx-4bc4-97a0-0ec2sifa5aaa

> 特别特别要注意：一定要**保护好消息推送的webhook地址**，避免泄漏！不要分享到github、博客等可被公开查阅的地方，否则坏人就可以用你的消息推送来发垃圾消息了。

以下是用curl工具往群组推送文本消息的示例（注意要将url替换成你的消息推送webhook地址，content必须是utf8编码）：

```javascript
curl 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=693axxx6-7aoc-4bc4-97a0-0ec2sifa5aaa' \
   -H 'Content-Type: application/json' \
   -d '
   {
    	"msgtype": "text",
    	"text": {
        	"content": "hello world"
    	}
   }'
```

- 当前自定义消息推送支持文本（text）、markdown（markdown、markdown\_v2）、图片（image）、图文（news）、文件（file）、语音（voice）、模板卡片（template\_card）八种消息类型。
- 消息推送的text/markdown类型消息支持在content中使用<@userid>扩展语法来@群成员（markdown\_v2类型消息不支持该扩展语法）

## [](https://developer.work.weixin.qq.com/document/path/99110#%E6%B6%88%E6%81%AF%E7%B1%BB%E5%9E%8B%E5%8F%8A%E6%95%B0%E6%8D%AE%E6%A0%BC%E5%BC%8F)消息类型及数据格式

### [](https://developer.work.weixin.qq.com/document/path/99110#%E6%96%87%E6%9C%AC%E7%B1%BB%E5%9E%8B)文本类型

```javascript
{
    "msgtype": "text",
    "text": {
        "content": "广州今日天气：29度，大部分多云，降雨概率：60%",
		"mentioned_list":["wangqing","@all"],
		"mentioned_mobile_list":["13800001111","@all"]
    }
}
```

| 参数 | 是否必填 | 说明 |
| --- | --- | --- |
| msgtype | 是 | 消息类型，此时固定为text |
| content | 是 | 文本内容，最长不超过2048个字节，必须是utf8编码 |
| mentioned\_list | 否 | userid的列表，提醒群中的指定成员(@某个成员)，@all表示提醒所有人，如果开发者获取不到userid，可以使用mentioned\_mobile\_list |
| mentioned\_mobile\_list | 否 | 手机号列表，提醒手机号对应的群成员(@某个成员)，@all表示提醒所有人 |

![](https://wework.qpic.cn/wwpic3az/155410_mgY2__q0TJ-k2s4_1754398034/0)

### [](https://developer.work.weixin.qq.com/document/path/99110#markdown%E7%B1%BB%E5%9E%8B)markdown类型

```json
{
    "msgtype": "markdown",
    "markdown": {
        "content": "实时新增用户反馈<font color=\"warning\">132例</font>，请相关同事注意。\n>类型:<font color=\"comment\">用户反馈</font>\n>普通用户反馈:<font color=\"comment\">117例</font>\n>VIP用户反馈:<font color=\"comment\">15例</font>"
    }
}
```

| 参数 | 是否必填 | 说明 |
| --- | --- | --- |
| msgtype | 是 | 消息类型，此时固定为markdown |
| content | 是 | markdown内容，最长不超过4096个字节，必须是utf8编码 |

![](https://wework.qpic.cn/wwpic3az/92917_Us9fVK4YTiaJGNB_1754398146/0)

目前支持的markdown语法是如下的子集：

1. 标题 （支持1至6级标题，注意#与文字中间要有空格）  
    
    ```javascript
    # 标题一
    ## 标题二
    ### 标题三
    #### 标题四
    ##### 标题五
    ###### 标题六
    ```
    
2. 加粗  
    
    ```javascript
    **bold**
    ```
    
3. 链接  
    
    ```javascript
    [这是一个链接](https://work.weixin.qq.com/api/doc)
    ```
    
4. 行内代码段（暂不支持跨行）  
    
    ```javascript
    `code`
    ```
    
5. 引用  
    
    ```javascript
    > 引用文字
    ```
    
6. 字体颜色(只支持3种内置颜色)  
    
    ```javascript
    <font color="info">绿色</font>
    <font color="comment">灰色</font>
    <font color="warning">橙红色</font>
    ```
    

### [](https://developer.work.weixin.qq.com/document/path/99110#markdown-v2%E7%B1%BB%E5%9E%8B)markdown\_v2类型

```json
{
	"msgtype": "markdown_v2",
	"markdown_v2": {
         "content": "# 一、标题\n## 二级标题\n### 三级标题\n# 二、字体\n*斜体*\n\n**加粗**\n# 三、列表 \n- 无序列表 1 \n- 无序列表 2\n  - 无序列表 2.1\n  - 无序列表 2.2\n1. 有序列表 1\n2. 有序列表 2\n# 四、引用\n> 一级引用\n>>二级引用\n>>>三级引用\n# 五、链接\n[这是一个链接](https:work.weixin.qq.com\/api\/doc)\n![](https://res.mail.qq.com/node/ww/wwopenmng/images/independent/doc/test_pic_msg1.png)\n# 六、分割线\n\n---\n# 七、代码\n`这是行内代码`\n```\n这是独立代码块\n```\n\n# 八、表格\n| 姓名 | 文化衫尺寸 | 收货地址 |\n| :----- | :----: | -------: |\n| 张三 | S | 广州 |\n| 李四 | L | 深圳 |\n"
	   }
}
```

| 参数 | 是否必填 | 说明 |
| --- | --- | --- |
| msgtype | 是 | 消息类型，此时固定为markdown\_v2。 |
| content | 是 | markdown\_v2内容，最长不超过4096个字节，必须是utf8编码。  
特殊的，  
1\. markdown\_v2**不支持字体颜色、@群成员**的语法， 具体支持的语法可参考下面说明  
2\. 消息内容在**客户端 4.1.36 版本以下(安卓端为4.1.38以下)** 消息表现为**纯文本**，建议使用最新客户端版本体验 |

![](https://wework.qpic.cn/wwpic3az/716751_Kk1npuyjShGnHv2_1754409187/0)

![](https://wework.qpic.cn/wwpic3az/420362_UAFblcRdQLWtiSZ_1749029414/0)

目前支持的markdown\_v2语法是如下的子集：

1. 标题 （支持1至6级标题，注意#与文字中间要有空格）  
    
    ```javascript
    # 标题一
    ## 标题二
    ### 标题三
    #### 标题四
    ##### 标题五
    ###### 标题六
    ```
    
2. 字体  
    
    ```javascript
    *斜体*
    **加粗**
    ```
    
3. 列表  
    
    ```javascript
    - 无序列表 1
    - 无序列表 2
     - 无序列表 2.1
     - 无序列表 2.2
    1. 有序列表 1
    2. 有序列表 2
    ```
    
4. 引用  
    
    ```javascript
    >一级引用
    >>二级引用
    >>>三级引用
    ```
    
5. 链接  
    
    ```javascript
    [这是一个链接](https://work.weixin.qq.com/api/doc)
    ![这是一个图片](https://res.mail.qq.com/node/ww/wwopenmng/images/independent/doc/test_pic_msg1.png)
    ```
    
6. 分割线  
    
    ```javascript
    
    ---
    ```
    
7. 代码  
    
    ```javascript
    `这是行内代码````这是独立代码块```
    ```
    
      
    
8. 表格  
    
    ```javascript
    | 姓名 | 文化衫尺寸 | 收货地址 |
    | :----- | :----: | -------: |
    | 张三 | S | 广州 |
    | 李四 | L | 深圳 |
    ```
    

### [](https://developer.work.weixin.qq.com/document/path/99110#%E5%9B%BE%E7%89%87%E7%B1%BB%E5%9E%8B)图片类型

```javascript
{
    "msgtype": "image",
    "image": {
        "base64": "DATA",
		"md5": "MD5"
    }
}
```

| 参数 | 是否必填 | 说明 |
| --- | --- | --- |
| msgtype | 是 | 消息类型，此时固定为image |
| base64 | 是 | 图片内容的base64编码 |
| md5 | 是 | 图片内容（base64编码前）的md5值 |

> 注：图片（base64编码前）最大不能超过2M，支持JPG,PNG格式

![](https://p.qpic.cn/pic_wework/2882333867/6b6d7c66fb1b8cbecf9e3a89ad87b6ef135d3c140496be31/0)

### [](https://developer.work.weixin.qq.com/document/path/99110#%E5%9B%BE%E6%96%87%E7%B1%BB%E5%9E%8B)图文类型

```javascript
{
    "msgtype": "news",
    "news": {
       "articles" : [
           {
               "title" : "中秋节礼品领取",
               "description" : "今年中秋节公司有豪礼相送",
               "url" : "www.qq.com",
               "picurl" : "https://res.mail.qq.com/node/ww/wwopenmng/images/independent/doc/test_pic_msg1.png"
           }
        ]
    }
}
```

| 参数 | 是否必填 | 说明 |
| --- | --- | --- |
| msgtype | 是 | 消息类型，此时固定为news |
| articles | 是 | 图文消息，一个图文消息支持1到8条图文 |
| title | 是 | 标题，不超过128个字节，超过会自动截断 |
| description | 否 | 描述，不超过512个字节，超过会自动截断 |
| url | 是 | 点击后跳转的链接。 |
| picurl | 否 | 图文消息的图片链接，支持JPG、PNG格式，较好的效果为大图 1068\*455，小图150\*150。 |