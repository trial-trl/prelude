<?php

namespace T\Prelude;

/**
 * 
 */
class Unit
{
    private array $_declaration;
    private string $_into;
    private $_key;
    private $_type;
    private string $_location;
    
    public array $_dom_attr = [];
    public string $_meta;
    public string $_head;
    public string $_title;
    public string $_footer;
    public array $_dependencies = [];

    /**
     * 
     */
    function __construct(string $type, string $into = null)
    {
        if (strpos($type, ':') === false) {
            $this->_key = 0;
        } else {
            list($type, $key) = explode(':', $type);
            $this->_key = $key;
        }

        if (!in_array($type, array_keys(UNITS))) {
            throw new InvalidArgumentException('Unit not registered');
        }

        $this->_type = $type;
        $this->_location = UNITS[$type];

        if (!empty($into)) {
            $this->_into = $into;
        }

        $this->loadDeclaration();
    }

    /**
     * 
     */
    function getType()
    {
        return $this->_type;
    }

    /**
     * 
     */
    function getKey()
    {
        return $this->_key ?: 0;
    }

    /**
     * 
     */
    function getName()
    {
        return $this->_type . (!empty($this->_key) ? ':' . $this->_key : '');
    }

    /**
     * 
     */
    function getTypePascalCaseStyle() {
        $camel = $this->getTypeCamelCaseStyle();
        return strtoupper($camel[0]) . substr($camel, 1);
    }

    /**
     * 
     */
    function getTypeCamelCaseStyle() {
        return preg_replace_callback(
            '/^([A-Z])|[\s-_](\w)/',
            function ($match, $p1, $p2) {
                if ($p2) {
                    return strtoupper($p2);
                }

                return strtolower($p1);
            },
            $this->getType()
        );
    }

    /**
     * 
     */
    function getLocation(bool $uri = false)
    {
        return ($uri ? '//' . $_SERVER['HTTP_HOST'] : $_SERVER['DOCUMENT_ROOT']) . $this->_location;
    }

    /**
     * 
     */
    function hasDeclaration()
    {
        return !empty($this->_declaration);
    }

    /**
     * 
     */
    function getTemplatePath()
    {
        if (!is_file($this->getLocation() . DIRECTORY_SEPARATOR . 'template.php')) {
            return $this->getLocation() . DIRECTORY_SEPARATOR . 'index.php';
        }

        return $this->getLocation() . DIRECTORY_SEPARATOR . 'template.php';
    }

    /**
     * 
     */
    function getTemplateClientPath()
    {
        return $this->getLocation() . DIRECTORY_SEPARATOR . 'template.js';
    }

    /**
     * 
     */
    function getStylePath()
    {
        return $this->getLocation() . DIRECTORY_SEPARATOR . 'style.css';
    }

    /**
     * 
     */
    function getControllerPath()
    {
        return $this->getLocation() . DIRECTORY_SEPARATOR . 'controller.js';
    }

    /**
     * 
     */
    function getStyleUri()
    {
        return $this->getLocation(true) . '/style.css';
    }

    /**
     * 
     */
    function getControllerUri()
    {
        return $this->getLocation(true) . '/controller.js';
    }

    /**
     * 
     */
    function render($data = [], $parentData = [])
    {
        $parentData[$this->getName()] = $data;

        $unit = $this->loadTemplate($data, $parentData);
        $unit = $this->loadDependencies($unit, $data, $parentData);
        $html = $this->wrapInUnitTag($unit);

        return $html;
    }

    /**
     * 
     */
    private function callEndpoint()
    {
        list($base, $route) = explode(':', $this->_declaration['endpoint']);
        $endpoint = DATASOURCE[$base] . $route;

        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: ' . $this->_declaration['expect']]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $response = curl_exec($ch);
        $request = curl_getinfo($ch);

        if ($request['http_code'] !== 200) {
            $error = curl_errno($ch) . ' ' . curl_error($ch);
            curl_close($ch);

            return [
                'loading' => false,
                'error' => true,
                'data' => $error
            ];
        }
        
        curl_close($ch);

        $data = $response;
        if ($this->_declaration['expect'] === 'application/json') {
            $data = json_decode($data, true);
        }
        
        return [
            'loading' => false,
            'error' => false,
            'data' => $data
        ];
    }

    /**
     * 
     */
    private function wrapInUnitTag(string $content)
    {
        $isRouterOutlet = strpos($this->_into, 'data-router-outlet') !== false;
        $content = sprintf(
            '<div data-unit="%s" data-key="%s"%s>%s</div>',
            $this->getType(),
            $this->getKey(),
            $isRouterOutlet ? ' data-router-outlet="true"' : '',
            $content
        );

        return $content;
    }
    
    /**
     * 
     */
    private function parseDeclarationHtml(array $matches)
    {
        preg_match('/<attr (.*)><\/attr>/', $matches[1], $attrs);
        $this->_dom_attr['html'] = $attrs[1];
        return '';
    }
    
    /**
     * 
     */
    private function parseDeclarationMeta(array $matches)
    {
        $this->_meta = $this->declareDataUnit($matches[1]);
        return '';
    }
    
    /**
     * 
     */
    private function parseDeclarationHead(array $matches)
    {
        $this->_head = $this->declareDataUnit($matches[1]);
        return '';
    }
    
    /**
     * 
     */
    private function parseDeclarationTitle(array $matches)
    {
        $this->_title = $matches[1];
        return '';
    }
    
    /**
     * 
     */
    private function parseDeclarationFooter(array $matches)
    {
        $this->_footer = $matches[1];
        return '';
    }
    
    /**
     * 
     */
    private function declareDataUnit(string $tags)
    {
        return preg_replace('/<([a-z]{1,)/', '<$1 data-unit="' . $this->getType() . '"', $tags);
    }
    
    /**
     * 
     */
    private function parseDeclarations(string $content)
    {
        $content = preg_replace_callback(
            '/<!-- #html -->(.*)<!-- html# -->/is',
            [$this, 'parseDeclarationHtml'],
            $content
        );
        $content = preg_replace_callback(
            '/<!-- #meta -->(.*)<!-- meta# -->/is',
            [$this, 'parseDeclarationMeta'],
            $content
        );
        $content = preg_replace_callback(
            '/<!-- #head -->(.*)<!-- head# -->/is',
            [$this, 'parseDeclarationHead'],
            $content
        );
        $content = preg_replace_callback(
            '/<!-- #title -->(.*)<!-- title# -->/is',
            [$this, 'parseDeclarationTitle'],
            $content
        );
        $content = preg_replace_callback(
            '/<!-- #footer -->(.*)<!-- footer# -->/is',
            [$this, 'parseDeclarationFooter'],
            $content
        );

        return $content;
    }

    /**
     * 
     */
    private function loadDependencies(string $content, $data = [], $parentData = [])
    {
        preg_match_all('/^.*\bdata-unit\b=\"([a-zA-Z0-9-]{1,})\".*$/m', $content, $dependencies);

        foreach ($dependencies[1] as $i => $dependency) {
            $caller = $dependencies[0][$i];
            
            preg_match('/data-key="([a-zA-Z0-9]{1,})"/', $caller, $key);

            $unit = new Unit($dependency . (!empty($key) ? ':' . $key[1] : ''), $caller);
            $content = str_replace(
                $caller,
                $unit->render([], $parentData),
                $content
            );
            $this->addDependency($unit);
        }

        return $content;
    }

    /**
     * 
     */
    private function addDependency(Unit $unit)
    {
        $this->_dependencies[] = $unit;
    }

    /**
     * 
     */
    private function loadDeclaration()
    {
        if (!file_exists($this->getLocation() . DIRECTORY_SEPARATOR . 'unit.json')) {
            return;
        }
        
        $this->_declaration = json_decode(file_get_contents($this->getLocation() . DIRECTORY_SEPARATOR . 'unit.json'), true);
    }

    /**
     * 
     */
    private function loadTemplate($data = [], $parentData = [])
    {
        extract($data);
        extract($parentData);

        $templateArgs = [];

        $initialRoute = $_SERVER['REQUEST_URI'];
        foreach (ROUTES as $path => $unit) {
            $path = str_replace('/', '\/', $path);
            if (preg_match("/^$path$/", $initialRoute, $args)) {
                $initialUnit = $unit;
                $templateArgs['params'] = $args;
                break;
            }
        }

        $templateArgs['loading'] = false;
        
        if ($this->hasDeclaration()) {
            $templateArgs['api'] = $this->callEndpoint();
            if (!empty($this->_declaration['lazy'])) {
                $templateArgs['loading'] = $this->_declaration['lazy'];
            }
        }

        extract($templateArgs);

        ob_start();
        include $this->getTemplatePath();
        $template = ob_get_contents();
        ob_clean();

        $template = $this->parseDeclarations($template);

        return $template;
    }
}