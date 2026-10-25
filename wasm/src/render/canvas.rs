use js_sys::{Function, Object, Reflect};
use wasm_bindgen::{JsCast, JsValue};

pub(super) fn configure_canvas_premultiplied(
    canvas: &web_sys::HtmlCanvasElement,
    device: &wgpu::Device,
    format: wgpu::TextureFormat,
) -> Result<(), String> {
    let get_context = Reflect::get(canvas.as_ref(), &JsValue::from_str("getContext"))
        .map_err(|_| "Could not access canvas.getContext".to_string())?
        .dyn_into::<Function>()
        .map_err(|_| "canvas.getContext is not callable".to_string())?;
    let context = get_context
        .call1(canvas.as_ref(), &JsValue::from_str("webgpu"))
        .map_err(|_| "Could not acquire the WebGPU canvas context".to_string())?;
    if context.is_null() || context.is_undefined() {
        return Err("WebGPU canvas context is unavailable".to_string());
    }

    let configuration = Object::new();
    let webgpu_device = device
        .as_webgpu()
        .ok_or_else(|| "Renderer is not using the browser WebGPU backend".to_string())?;
    let raw_device: &JsValue = webgpu_device.as_ref();
    Reflect::set(&configuration, &JsValue::from_str("device"), raw_device)
        .map_err(|_| "Could not set the WebGPU canvas device".to_string())?;
    let format_name = match format {
        wgpu::TextureFormat::Rgba8Unorm => "rgba8unorm",
        wgpu::TextureFormat::Bgra8Unorm => "bgra8unorm",
        _ => return Err("Unsupported WebGPU canvas texture format".to_string()),
    };
    Reflect::set(
        &configuration,
        &JsValue::from_str("format"),
        &JsValue::from_str(format_name),
    )
    .map_err(|_| "Could not set the WebGPU canvas format".to_string())?;
    Reflect::set(
        &configuration,
        &JsValue::from_str("alphaMode"),
        &JsValue::from_str("premultiplied"),
    )
    .map_err(|_| "Could not set premultiplied canvas alpha".to_string())?;
    let configure = Reflect::get(&context, &JsValue::from_str("configure"))
        .map_err(|_| "Could not access WebGPU context.configure".to_string())?
        .dyn_into::<Function>()
        .map_err(|_| "WebGPU context.configure is not callable".to_string())?;
    configure
        .call1(&context, configuration.as_ref())
        .map_err(|_| "Could not configure premultiplied WebGPU canvas alpha".to_string())?;
    Ok(())
}
