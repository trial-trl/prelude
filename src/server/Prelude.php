<?php

namespace T;

use T\Prelude\Unit;

/**
 * 
 */
class Prelude
{
    private array $_declaration;
    private Unit $_unit;
    
    private array $_dependencies = [];

    /**
     * 
     */
    function __construct()
    {
        $this->_unit = new Unit('app', '<!-- injectAppUnit -->');
    }

    /**
     * 
     */
    function getUnit()
    {
        return $this->_type;
    }

    /**
     * 
     */
    function render($data = [], $parentData = [])
    {
        $parentData['global'] = $data;
        
        $app  = $this->loadApp($data, $parentData);
        $html = $this->injectAppDependencies($app, $data, $parentData);

        return $html;
    }

    /**
     * 
     */
    private function loadApp($data = [], $parentData = [])
    {
        $content = file_get_contents(__DIR__ . DIRECTORY_SEPARATOR . 'app.html');
        return str_replace('<!-- injectAppUnit -->', $this->_unit->render($data, $parentData), $content);
    }

    /**
     * 
     */
    private function injectAppDependencies(string $render, $data = [], $parentData = [])
    {
        $template_link = '<link rel="stylesheet" type="text/css" href="%s" data-unit="%s" />';
        $template_script = '<script src="%s" data-unit="%s"></script>';

        $styles = '';
        $controllers = '';
        $templates = '';
        $attr = '';
        $meta = '';
        $head = '';
        $title = '';
        $footer = '';

        $units = array_merge([$this->_unit], $this->_unit->_dependencies);

        foreach ($units as $unit) {
            if (!empty($unit->_meta)) {
                $meta .= $unit->_meta;
            }
            if (!empty($unit->_head)) {
                $head .= $unit->_head;
            }
            if (!empty($unit->_dom_attr['html'])) {
                $attr = $unit->_dom_attr['html'];
            }
            if (!empty($unit->_title)) {
                $title = $unit->_title;
            }
            if (!empty($unit->_footer)) {
                $footer = $unit->_footer;
            }
            $styles .= sprintf($template_link, $unit->getStyleUri(), $unit->getType());
            $controllers .= sprintf($template_script, $unit->getControllerUri(), $unit->getType());
            $templates .= @file_get_contents($unit->getTemplateClientPath()) . ';';
        }

        $render = str_replace('<!-- injectHtmlAttrs -->', $attr ?: '', $render);
        $render = str_replace('<!-- injectMetaDeclarations -->', $meta ?: '', $render);
        $render = str_replace('<!-- injectHeadDeclarations -->', $head ?: '', $render);
        $render = str_replace('<!-- injectTitle -->', '<title>' . trim($title ?: '') . '</title>', $render);
        $render = str_replace('<!-- injectStyleDependencies -->', $styles, $render);
        $render = str_replace('<!-- injectControllerDependencies -->', $controllers . $footer, $render);

        $declaration = $this->transformAppDeclarationToJavascript();
        $encoded_data = json_encode($data);
        $encoded_parentData = json_encode($parentData);

        $render = str_replace(
            '<!-- injectAppDependencies -->',
            <<<HTML
                <script>
                    $templates;
                    T.Prelude.create(JSON.parse('$declaration'))
                        .init(JSON.parse('$encoded_data'), JSON.parse('$encoded_parentData'));
                </script>
            HTML,
            $render
        );

        return $render;
    }

    /**
     * 
     */
    private function transformAppDeclarationToJavascript()
    {
        $declaration = APP;
        $units = $declaration['units'];
        $declaration['units'] = [];

        foreach ($units as $type => $path) {
            $unit = ['location' => $path];

            if (file_exists($_SERVER['DOCUMENT_ROOT'] . $path . '/unit.json')) {
                $unit += json_decode(file_get_contents($_SERVER['DOCUMENT_ROOT'] . $path . '/unit.json'), true);
            }

            $declaration['units'][$type] = $unit;
        }

        return json_encode($declaration);
    }
}