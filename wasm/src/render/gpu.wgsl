struct ClipUniforms {
    inverse_transform: mat3x3<f32>,
    image_size: vec2<f32>,
    output_size: vec2<f32>,
    opacity: f32,
    blend_mode: u32,
    _padding: vec2<f32>,
    tint_color: vec4<f32>,
};

@group(0) @binding(0) var clip_texture: texture_2d<f32>;
@group(0) @binding(1) var clip_sampler: sampler;
@group(0) @binding(2) var<uniform> uniforms: ClipUniforms;
@group(0) @binding(3) var destination_texture: texture_2d<f32>;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
};

@vertex
fn vertex_main(@builtin(vertex_index) index: u32) -> VertexOutput {
    var positions = array<vec2<f32>, 3>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(3.0, -1.0),
        vec2<f32>(-1.0, 3.0),
    );
    return VertexOutput(vec4<f32>(positions[index], 0.0, 1.0));
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4<f32> {
    let output_pixel = vec3<f32>(input.position.xy, 1.0);
    let source_pixel = uniforms.inverse_transform * output_pixel;
    let source_uv = source_pixel.xy / uniforms.image_size;
    let destination_uv = input.position.xy / uniforms.output_size;
    let destination = textureSample(destination_texture, clip_sampler, destination_uv);

    if source_uv.x < 0.0 || source_uv.y < 0.0 || source_uv.x >= 1.0 || source_uv.y >= 1.0 {
        return destination;
    }

    let sampled_source = textureSampleLevel(clip_texture, clip_sampler, source_uv, 0.0);
    let source = vec4<f32>(mix(sampled_source.rgb, uniforms.tint_color.rgb, uniforms.tint_color.a), sampled_source.a);
    let source_alpha = source.a * uniforms.opacity;
    let destination_alpha = destination.a;
    var destination_color = vec3<f32>(0.0);
    if destination_alpha > 0.0 {
        destination_color = destination.rgb / destination_alpha;
    }
    var blend_color = source.rgb;

    switch uniforms.blend_mode {
        case 1u: {
            blend_color = source.rgb * destination_color;
        }
        case 2u: {
            blend_color = source.rgb + destination_color - source.rgb * destination_color;
        }
        case 3u: {
            blend_color = min(source.rgb + destination_color, vec3<f32>(1.0));
        }
        default: {}
    }

    let source_premultiplied = source.rgb * source_alpha;
    let destination_premultiplied = destination.rgb;
    let output_color =
        (1.0 - source_alpha) * destination_premultiplied
        + (1.0 - destination_alpha) * source_premultiplied
        + source_alpha * destination_alpha * blend_color;
    let output_alpha = source_alpha + destination_alpha * (1.0 - source_alpha);

    return vec4<f32>(output_color, output_alpha);
}
