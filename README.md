Todas as unidades serão renderizadas primeiramente pelo servidor.

Em rotas privadas, o estado será desconhecido. Portanto, o renderizador passará às unidades a propriedade **loading** com valor **true**. Marcadores de posição serão devem ser renderizados no lugar, sendo um papel do modelo de apresentação.

Quando o cliente tomar controle da renderização, essas unidades sem estado serão **re-renderizadas**.
