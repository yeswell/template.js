export default class Template
{
    static copy(template_name)
    {
        let templates = Array.from(document.getElementById("templates").children);
        
        let index = templates.findIndex(child =>
        {
            return (child.hasAttribute("template") && (child.getAttribute("template") === template_name));
        });
        
        return ((index > -1) ? create_elem(templates[index].outerHTML) : undefined);
    }
    
    static paste(template, elem = document.body, i = 0)
    {
        if (! template.hasAttribute("template")) return false;
        
        let template_name = template.getAttribute("template");
        let includes = elem.querySelectorAll("[include=\"" + template_name + "\"]");
        
        if (includes.length <= i) return false;
        
        insert(template, includes[i]);
        
        return true;
    }
    
    static copy_paste(template_name, elem = document.body, i = 0)
    {
        return this.paste(this.copy(template_name), elem, i);
    }
    
    static auto(templates_names = [], elem = document.body)
    {
        let children = Array.from(elem.querySelectorAll(":scope > div:not(#templates)"));
        
        let possible_includes = children.reduce((possible_includes, child) =>
        {
            let all_include = Array.from(child.querySelectorAll("[include]"));
            let all_n       = Array.from(child.querySelectorAll("[n]"));
            
            let child_includes = all_include.filter(include =>
            {
                return all_n.includes(include);
            });
            
            possible_includes.push(...child_includes);
            
            return possible_includes;
        }, []);
        
        let includes = [];
        
        if (templates_names.length > 0)
        {
            includes = possible_includes.filter(include =>
            {
                return templates_names.includes(include.getAttribute("include"));
            });
        }
        else
        {
            includes = possible_includes;
        }
        
        includes.forEach(include =>
        {
            let template_name = include.getAttribute("include");
            let template = this.copy(template_name);
            
            this.auto([], template.firstElementChild);
            
            let n = get_attr(include, "n", [0, 0, Number.MAX_SAFE_INTEGER]);
            
            for (let i = 0; i < n; ++i)
            {
                insert(create_elem(template.outerHTML), include);
            }
        });
    }
}

function insert(template, include)
{
    let i = get_attr(include, "i", [0, 0, Number.MAX_SAFE_INTEGER]);
    set_attr(include, "i", i + 1);
    
    let html_parts = template.innerHTML.split("{~}");
    let N = html_parts.length - 1;
    
    if (N > 0)
    {
        let replacements = get_replacements(include, N, i);

        template.innerHTML = html_parts.reduce((html, part, i) =>
        {
            return (html + part + replacements[i]);
        }, "");
    };
    
    let type = get_attr(include, "type", ["before", "instead", "after"]);
    let func =
    {
        before : "before",
        instead: "replaceWith",
        after  : "after"
    };
    
    include[func[type]](template.firstElementChild);
}

function get_replacements(elem, N, k)
{
    let text = elem.innerHTML;
    let rows = text.split(/}\s+{/).map(elem => elem.trim());
    
    let n = rows.length - 1;
    rows[0] = rows[0].slice(1);
    rows[n] = rows[n].slice(0, -1);
    
    rows = rows.map(row => row.split("}{"));
    
    let replacements = [];
    
    for (let i = 0; i < N; ++i)
    {
        if (i <= n)
        {
            let m = rows[i].length;
            let str = rows[i][k % m];
            
            if (str.charAt(0) === "#")
            {
                let counter = parse_counter(str);
                
                rows[i][k % m] = counter.string;
                
                replacements.push(counter.value);
            }
            else
            {
                replacements.push(str);
            }
        }
        else
        {
            replacements.push("{~}");
        }
    }
    
    replacements.push("");
    
    let lines = rows.map(row => ("{" + row.join("}{") + "}"));
    elem.innerHTML = lines.join("\n");
    
    return replacements;
}

function get_attr(elem, attr, values)
{
    let str = elem.getAttribute(attr);
    let value = values[0];

    switch (typeof(value))
    {
        case "number":
            let n = Number.parseInt(str);
            if (Number.isSafeInteger(n) && (values[1] <= n) && (n <= values[2])) value = n;
        break;
            
        case "string":
            if (values.includes(str)) value = str;
        break;
    }
        
    return value;
}

function set_attr(elem, attr, value)
{
    elem.setAttribute(attr, value);
}

function parse_counter(str)
{
    let counter =
    {
        value : str,
        string: str
    };
    
    str = str.slice(1);
    
    let i = str.lastIndexOf("+");
    let j = str.lastIndexOf("-");
    let k = ((i > 0) || (j > 0)) ? Math.max(i, j) : 0;
    
    if (k > 0)
    {
        let n = Number.parseInt(str.slice(0, k));
        let m = Number.parseInt(str.slice(k));
        
        if (Number.isSafeInteger(n) && Number.isSafeInteger(m))
        {
            counter.value  = n;
            counter.string = "#" + (n + m) + ((m < 0) ? "" : "+") + m;
        };
    };
    
    return counter;
}

function create_elem(html)
{
    let div = document.createElement("div");
    div.innerHTML = html;
            
    return div.firstElementChild;
}